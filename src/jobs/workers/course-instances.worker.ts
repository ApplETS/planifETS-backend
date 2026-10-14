import { Injectable, Logger } from '@nestjs/common';
import { Availability, Course, CourseInstance, Session } from '@prisma/client';

import { CourseCodeValidationPipe } from '@/common/pipes/models/course/course-code-validation-pipe';
import { AvailabilityUtil } from '@/common/utils/course-instance/courseInstanceUtil';
import { PlanificationCoursService } from '@/common/website-helper/pdf/pdf-parser/planification/planification-cours.service';
import { ICoursePlanification } from '@/common/website-helper/pdf/pdf-parser/planification/planification-cours.types';

import { CourseService } from '../../course/course.service';
import { CourseInstanceService } from '../../course-instance/course-instance.service';
import { seedProgramPlanificationPdfParserFlags } from '../../prisma/programs.seeder';
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

  /**
   * Main method to process course instances.
   */
  public async processCourseInstances(): Promise<void> {
    this.logger.log('Starting processCourseInstances job.');

    // Seed programs with planificationParsablePdf = true
    await seedProgramPlanificationPdfParserFlags();

    const programs =
      await this.programService.getProgramsByPlanificationParsablePDF();
    if (!programs.length) {
      this.logger.warn('No programs found with parsable planification PDFs.');
      return;
    }

    // Collect parsed data from all programs
    const allParsedData: ICoursePlanification[] = [];
    let successfulForecasts = 0;
    const incompletePrograms: string[] = [];
    for (const program of programs) {
      if (!program.code) {
        this.logger.warn(`Program ${program.id} has no code. Skipping.`);
        incompletePrograms.push(`id=${program.id}`);
        continue;
      }
      if (program.code.includes(',')) {
        this.logger.warn(
          `Program ${program.code} has multiple codes (comma-separated). Skipping PDF parsing.`
        );
        incompletePrograms.push(program.code);
        continue;
      }
      this.logger.log(`Processing program: ${program.code}`);

      try {
        // Parse one PDF at a time to bound memory and remote requests.
        const parsedData =
          await this.planificationCourseService.parseProgramPlanification(
            program.code
          );
        const complete = await this.syncProgramCourseLinks(
          program.id,
          program.code,
          parsedData
        ); // NOSONAR: Intentionally process one program at a time to bound database load and preserve ordering.
        allParsedData.push(...parsedData);
        if (complete) {
          successfulForecasts++;
        } else {
          incompletePrograms.push(program.code);
        }
      } catch (error) {
        incompletePrograms.push(program.code);
        if (error instanceof Error) {
          this.logger.warn(
            `Error parsing planification PDF for program ${program.code}`,
            error
          );
        } else {
          this.logger.warn(
            `Error parsing planification PDF for program ${program.code}: ${String(error)}`
          );
        }
      }
    }

    // Process all parsed data together
    if (incompletePrograms.length) {
      this.logger.warn(
        `Skipping obsolete course-instance deletion and availability reductions: ${successfulForecasts}/${programs.length} program forecasts passed checks; incomplete programs: [${incompletePrograms.join(', ')}]. See per-program warnings for reasons.`
      );
    }
    await this.processAllParsedData(
      allParsedData,
      successfulForecasts === programs.length
    );

    this.logger.log('Completed processCourseInstances job.');
  }

  private async syncProgramCourseLinks(
    programId: number,
    programCode: string,
    parsedData: ICoursePlanification[]
  ): Promise<boolean> {
    // Membership comes from every listed course, not just scheduled offerings.
    const validRows = parsedData.filter((row) =>
      this.courseCodeValidationPipe.transform(row.code)
    );
    const courseCodes = new Set(validRows.map((row) => row.code.trim()));
    const courses = await this.fetchCourses(courseCodes);
    for (const code of courseCodes) {
      const course = courses.get(code);
      if (!course) {
        this.logger.warn(
          `Course ${code} from forecast PDF for program ${programCode} not found in database. Skipping program link.`
        );
        continue;
      }
      // The existing create method skips existing links without changing metadata.
      const programCourseData = {
        program: { connect: { id: programId } },
        course: { connect: { id: course.id } }
      };
      await this.programCourseService.createProgramCourse(programCourseData); // NOSONAR: Keep existence-check/create operations sequential instead of issuing unbounded database writes.
    }

    if (
      validRows.length !== parsedData.length ||
      courses.size !== courseCodes.size ||
      courseCodes.size <= CourseInstancesJobService.MIN_COURSES_FOR_PRUNING
    ) {
      this.logger.warn(
        `Skipping program-course pruning for program ${programCode}: ${courseCodes.size} distinct courses (required: >${CourseInstancesJobService.MIN_COURSES_FOR_PRUNING}), ${validRows.length}/${parsedData.length} valid rows, ${courses.size}/${courseCodes.size} catalog matches.`
      );
      return false;
    }

    const listedCourseIds = new Set(
      [...courses.values()].map((course) => course.id)
    );
    const existingLinks =
      await this.programCourseService.getProgramCoursesByProgram(programId);
    const removedCourseIds = existingLinks
      .filter((link) => !listedCourseIds.has(link.courseId))
      .map((link) => link.courseId);
    const deletedCount =
      await this.programCourseService.deleteProgramCoursesWithPrerequisites(
        programId,
        removedCourseIds
      );
    this.logger.log(
      `Removed ${deletedCount} program-course links absent from forecast for program ${programCode} (courseIds: [${removedCourseIds.join(', ')}]).`
    );
    return true;
  }

  private async processAllParsedData(
    allParsedData: ICoursePlanification[],
    canDeleteObsoleteInstances: boolean
  ): Promise<void> {
    const { sessionCodesSet, courseCodesSet } =
      this.extractUniqueCodes(allParsedData);

    const sessionCodeToSessionMap = await this.fetchSessions(sessionCodesSet);
    const courseCodeToCourseMap = await this.fetchCourses(courseCodesSet);

    const requiredInstancesMap = this.buildRequiredInstancesMap(
      allParsedData,
      courseCodeToCourseMap,
      sessionCodeToSessionMap
    );

    const existingInstancesMap = await this.fetchExistingInstancesMap();

    const { addedCount, updatedCount } = await this.processRequiredInstances(
      requiredInstancesMap,
      existingInstancesMap,
      courseCodeToCourseMap,
      sessionCodeToSessionMap,
      canDeleteObsoleteInstances
    );

    // Offerings are shared across programs, so partial forecasts cannot prove absence.
    const deletedCount = canDeleteObsoleteInstances
      ? await this.deleteObsoleteInstances(existingInstancesMap)
      : 0;

    this.logger.log(
      `Total Added ${addedCount} instances. Updated ${updatedCount} instances. Deleted ${deletedCount} instances.`
    );
  }

  private extractUniqueCodes(allParsedData: ICoursePlanification[]): {
    sessionCodesSet: Set<string>;
    courseCodesSet: Set<string>;
  } {
    const sessionCodesSet = new Set<string>();
    const courseCodesSet = new Set<string>();
    for (const courseData of allParsedData) {
      if (Object.keys(courseData.available).length === 0) {
        continue;
      }
      courseCodesSet.add(courseData.code);
      Object.keys(courseData.available).forEach((sessionCode) => {
        sessionCodesSet.add(sessionCode);
      });
    }
    return { sessionCodesSet, courseCodesSet };
  }

  private async fetchSessions(
    sessionCodesSet: Set<string>
  ): Promise<Map<string, Session>> {
    const sessionCodeToSessionMap = new Map<string, Session>();
    for (const sessionCode of sessionCodesSet) {
      // Sequential upserts bound database load.
      const session =
        await this.sessionService.getOrCreateSessionFromCode(sessionCode); // NOSONAR: sequential upserts bound database load
      sessionCodeToSessionMap.set(sessionCode, session);
    }
    return sessionCodeToSessionMap;
  }

  private async fetchCourses(
    courseCodesSet: Set<string>
  ): Promise<Map<string, Course>> {
    const courses = await this.courseService.getCoursesByCodes(
      Array.from(courseCodesSet)
    );
    const courseCodeToCourseMap = new Map<string, Course>();

    for (const course of courses) {
      courseCodeToCourseMap.set(course.code, course);
    }

    return courseCodeToCourseMap;
  }

  private buildRequiredInstancesMap(
    allParsedData: ICoursePlanification[],
    courseCodeToCourseMap: Map<string, Course>,
    sessionCodeToSessionMap: Map<string, Session>
  ): Map<
    string,
    {
      courseId: number;
      courseCode: string;
      sessionYear: number;
      sessionTrimester: string;
      sessionCode: string;
      availability: Availability[];
    }
  > {
    const requiredInstancesMap = new Map<
      string,
      {
        courseId: number;
        courseCode: string;
        sessionYear: number;
        sessionTrimester: string;
        sessionCode: string;
        availability: Availability[];
      }
    >();
    for (const courseData of allParsedData) {
      const course = courseCodeToCourseMap.get(courseData.code);
      if (!course) {
        this.logger.verbose(`Course ${courseData.code} not found. Skipping.`);
        continue;
      }

      for (const [sessionCode, availabilityCode] of Object.entries(
        courseData.available
      )) {
        const session = sessionCodeToSessionMap.get(sessionCode);
        if (!session) {
          this.logger.warn(`Session ${sessionCode} not found. Skipping.`);
          continue;
        }
        const parsedAvailabilities =
          AvailabilityUtil.parseAvailability(availabilityCode);

        if (!parsedAvailabilities) {
          this.logger.warn(
            `Invalid availability code "${availabilityCode}" for course "${courseData.code}"
              in session "${sessionCode}". Skipping.`
          );
          continue;
        }

        const key = this.generateInstanceKey(
          course.id,
          session.year,
          session.trimester
        );
        const existing = requiredInstancesMap.get(key);
        requiredInstancesMap.set(key, {
          courseId: course.id,
          courseCode: course.code,
          sessionYear: session.year,
          sessionTrimester: session.trimester,
          sessionCode,
          availability: existing
            ? [...new Set([...existing.availability, ...parsedAvailabilities])]
            : parsedAvailabilities
        });
      }
    }
    return requiredInstancesMap;
  }

  private async fetchExistingInstancesMap(): Promise<
    Map<string, CourseInstance>
  > {
    const existingInstances =
      await this.courseInstanceService.getAllCourseInstances();
    const existingInstancesMap = new Map<string, CourseInstance>();
    for (const instance of existingInstances) {
      const key = this.generateInstanceKey(
        instance.courseId,
        instance.sessionYear,
        instance.sessionTrimester
      );
      existingInstancesMap.set(key, instance);
    }
    return existingInstancesMap;
  }

  private async processRequiredInstances(
    requiredInstancesMap: Map<
      string,
      {
        courseId: number;
        courseCode: string;
        sessionYear: number;
        sessionTrimester: string;
        sessionCode: string;
        availability: Availability[];
      }
    >,
    existingInstancesMap: Map<string, CourseInstance>,
    courseCodeToCourseMap: Map<string, Course>,
    sessionCodeToSessionMap: Map<string, Session>,
    canRemoveAvailability: boolean
  ): Promise<{ addedCount: number; updatedCount: number }> {
    let addedCount = 0;
    let updatedCount = 0;

    for (const [key, requiredInstance] of requiredInstancesMap.entries()) {
      const existingInstance = existingInstancesMap.get(key);

      const course = courseCodeToCourseMap.get(requiredInstance.courseCode);
      const session = sessionCodeToSessionMap.get(requiredInstance.sessionCode);

      if (!session || !course) {
        this.logger.warn(
          `Session or course not found for key ${key}. Skipping.`
        );
        continue;
      }

      if (existingInstance) {
        const availability = canRemoveAvailability
          ? requiredInstance.availability
          : [
              ...new Set([
                ...existingInstance.availability,
                ...requiredInstance.availability
              ])
            ];
        // Compare and update availability if different
        const isSame = AvailabilityUtil.areAvailabilitiesEqual(
          existingInstance.availability,
          availability
        );
        if (!isSame) {
          // Sequential writes bound database load and stop synchronization on failure.
          await this.courseInstanceService.updateCourseInstanceAvailability(
            existingInstance,
            availability
          );
          updatedCount++;
        }
        // Remove from existingInstancesMap to mark as processed
        existingInstancesMap.delete(key);
      } else {
        // Sequential writes bound database load and stop synchronization on failure.
        await this.courseInstanceService.createCourseInstance(
          course,
          session,
          requiredInstance.availability
        );
        addedCount++;
      }
    }
    return { addedCount, updatedCount };
  }

  private async deleteObsoleteInstances(
    existingInstancesMap: Map<string, CourseInstance>
  ): Promise<number> {
    let deletedCount = 0;
    for (const instance of existingInstancesMap.values()) {
      // Sequential deletes bound database load and stop on failure.
      await this.courseInstanceService.deleteCourseInstance(
        instance.courseId,
        instance.sessionYear,
        instance.sessionTrimester
      );
      deletedCount++;
    }
    return deletedCount;
  }

  private generateInstanceKey(
    courseId: number,
    sessionYear: number,
    sessionTrimester: string
  ): string {
    return `${courseId}-${sessionYear}-${sessionTrimester}`;
  }
}
