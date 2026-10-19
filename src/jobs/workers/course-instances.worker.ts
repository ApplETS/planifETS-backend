import { Injectable, Logger } from '@nestjs/common';

import { CourseCodeValidationPipe } from '@/common/pipes/models/course/course-code-validation-pipe';
import { AvailabilityUtil } from '@/common/utils/course-instance/courseInstanceUtil';
import { PlanificationCoursService } from '@/common/website-helper/pdf/pdf-parser/planification/planification-cours.service';
import { ICoursePlanification } from '@/common/website-helper/pdf/pdf-parser/planification/planification-cours.types';

import { CourseService } from '../../course/course.service';
import {
  CourseInstanceService,
  CourseInstanceUpdateInput
} from '../../course-instance/course-instance.service';
import {
  seedProgramPlanificationPdfParserFlags,
  seedUmbrellaPrograms
} from '../../prisma/programs.seeder';
import { ProgramService } from '../../program/program.service';
import { ProgramCourseService } from '../../program-course/program-course.service';
import { SessionService } from '../../session/session.service';

@Injectable()
export class CourseInstancesJobService {
  private static readonly MIN_COURSES_FOR_PRUNING = 20;
  private readonly logger = new Logger(CourseInstancesJobService.name);
  private readonly courseCodeValidationPipe = new CourseCodeValidationPipe();

  constructor(
    private readonly planificationCourseService: PlanificationCoursService,
    private readonly programService: ProgramService,
    private readonly courseService: CourseService,
    private readonly courseInstanceService: CourseInstanceService,
    private readonly sessionService: SessionService,
    private readonly programCourseService: ProgramCourseService
  ) {}

  public async processCourseInstances(): Promise<void> {
    await seedUmbrellaPrograms();
    await seedProgramPlanificationPdfParserFlags();
    const programs =
      await this.programService.getProgramsByPlanificationParsablePDF();
    if (!programs.length) {
      this.logger.warn('No programs found with parsable planification PDFs.');
      return;
    }
    const inputs: CourseInstanceUpdateInput[] = [];
    const incompletePrograms: string[] = [];
    for (const program of programs) {
      if (!program.code || program.code.includes(',')) {
        incompletePrograms.push(program.code ?? `id=${program.id}`);
        continue;
      }
      try {
        const { courses: rows, sessionCodes } =
          await this.planificationCourseService.parseProgramForecast(
            program.code
          );
        if (!sessionCodes.length)
          throw new Error('No forecast session headers.');
        const complete = await this.syncProgramCourseLinks(
          program.id,
          program.code,
          rows
        );
        if (!complete) incompletePrograms.push(program.code);
        inputs.push(...(await this.prepareSources(rows, sessionCodes)));
      } catch (error) {
        incompletePrograms.push(program.code);
        this.logger.warn(
          `Error parsing planification PDF for program ${program.code}`,
          error
        );
      }
    }
    await this.courseInstanceService.updateCourseInstances(inputs);
  }

  private async prepareSources(
    rows: ICoursePlanification[],
    sessionCodes: string[]
  ): Promise<CourseInstanceUpdateInput[]> {
    const courses = await this.courseService.getCoursesByCodes([
      ...new Set(rows.map((row) => row.code.trim()))
    ]);
    const courseMap = new Map(courses.map((course) => [course.code, course]));
    const inputs: CourseInstanceUpdateInput[] = [];
    for (const code of sessionCodes) {
      const session =
        await this.sessionService.getOrCreateSessionFromCode(code);
      const offerings = new Map<
        number,
        NonNullable<ReturnType<typeof AvailabilityUtil.parseAvailability>>
      >();
      for (const row of rows) {
        const course = courseMap.get(row.code.trim());
        if (!course) continue;
        const availability = AvailabilityUtil.parseAvailability(
          row.available[code] ?? ''
        );
        if (!availability)
          throw new Error(`Invalid availability for ${row.code}/${code}.`);
        offerings.set(course.id, [
          ...new Set([...(offerings.get(course.id) ?? []), ...availability])
        ]);
      }
      inputs.push({
        session,
        offerings: [...offerings].map(([courseId, availability]) => ({
          courseId,
          availability
        }))
      });
    }
    return inputs;
  }

  private async syncProgramCourseLinks(
    programId: number,
    programCode: string,
    parsedData: ICoursePlanification[]
  ): Promise<boolean> {
    const validRows = parsedData.filter((row) =>
      this.courseCodeValidationPipe.transform(row.code)
    );
    const courseCodes = new Set(validRows.map((row) => row.code.trim()));
    const courses = await this.courseService.getCoursesByCodes([
      ...courseCodes
    ]);
    const byCode = new Map(courses.map((course) => [course.code, course]));
    for (const code of courseCodes) {
      const course = byCode.get(code);
      if (!course) {
        this.logger.warn(
          `Course ${code} from forecast PDF for program ${programCode} not found in database. Skipping program link.`
        );
        continue;
      }
      await this.programCourseService.createProgramCourse({
        program: { connect: { id: programId } },
        course: { connect: { id: course.id } }
      });
    }
    if (
      validRows.length !== parsedData.length ||
      byCode.size !== courseCodes.size ||
      courseCodes.size <= CourseInstancesJobService.MIN_COURSES_FOR_PRUNING
    ) {
      this.logger.warn(
        `Skipping program-course pruning for program ${programCode}: ${courseCodes.size} distinct courses (required: >${CourseInstancesJobService.MIN_COURSES_FOR_PRUNING}), ${validRows.length}/${parsedData.length} valid rows, ${byCode.size}/${courseCodes.size} catalog matches.`
      );
      return false;
    }
    const listed = new Set(courses.map((course) => course.id));
    const links =
      await this.programCourseService.getProgramCoursesByProgram(programId);
    const removedIds = links
      .filter((link) => !listed.has(link.courseId))
      .map((link) => link.courseId);
    await this.programCourseService.deleteProgramCoursesWithPrerequisites(
      programId,
      removedIds
    );
    return true;
  }
}
