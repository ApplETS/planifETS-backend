import { Injectable, Logger } from '@nestjs/common';
import {
  Availability,
  Course,
  CourseInstance,
  Program,
  Session,
} from '@prisma/client';

import { AvailabilityUtil } from '../../common/utils/course-instance/courseInstanceUtil';
import { PlanificationCoursService } from '../../common/website-helper/pdf/pdf-parser/planification/planification-cours.service';
import { CourseService } from '../../course/course.service';
import { CourseInstanceService } from '../../course-instance/course-instance.service';
import { seedProgramPlanificationPdfParserFlags } from '../../prisma/programs.seeder';
import { ProgramService } from '../../program/program.service';
import { SessionService } from '../../session/session.service';

type ParsedCourseData = {
  code: string;
  available: Record<string, string>;
};

@Injectable()
export class CourseInstancesJobService {
  private readonly logger = new Logger(CourseInstancesJobService.name);

  constructor(
    private readonly planificationCourseService: PlanificationCoursService,
    private readonly programService: ProgramService,
    private readonly courseService: CourseService,
    private readonly courseInstanceService: CourseInstanceService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Main method to process course instances.
   */
  public async processCourseInstances(): Promise<void> {
    this.logger.log('Starting processCourseInstances job.');

    // Seed programs with horaireParsablePdf = true
    await seedProgramPlanificationPdfParserFlags();

    const programs =
      await this.programService.getProgramsByPlanificationParsablePDF();
    if (!programs.length) {
      this.logger.warn('No programs found with parsable planification PDFs.');
      return;
    }

    for (const program of programs) {
      await this.processProgram(program);
    }

    this.logger.log('Completed processCourseInstances job.');
  }

  private async processProgram(program: Program): Promise<void> {
    if (!program.code) {
      this.logger.warn(`Program ${program.id} has no code. Skipping.`);
      return;
    }
    this.logger.log(`Processing program: ${program.code}`);

    const parsedData =
      await this.planificationCourseService.parseProgramPlanification(
        program.code,
      );

    const addedInstances: CourseInstance[] = [];
    const removedInstances: CourseInstance[] = [];

    for (const courseData of parsedData) {
      await this.processCourse(courseData, addedInstances, removedInstances);
    }

    this.logger.log(
      `Program ${program.code}: Added ${addedInstances.length} instances, Removed ${removedInstances.length} instances.`,
    );
  }

  private async processCourse(
    courseData: ParsedCourseData,
    addedInstances: CourseInstance[],
    removedInstances: CourseInstance[],
  ): Promise<void> {
    const course = await this.courseService.getCourseByCode(courseData.code);

    if (!course) {
      this.logger.warn(`Course ${courseData.code} not found. Skipping.`);
      return;
    }

    const existingInstances =
      await this.courseInstanceService.getCourseInstancesByCourse(course.id);
    const existingInstancesMap =
      this.mapExistingInstancesBySession(existingInstances);

    for (const [sessionCode, availabilityCode] of Object.entries(
      courseData.available,
    )) {
      const session =
        await this.sessionService.getOrCreateSessionFromCode(sessionCode);

      const parsedAvailability =
        AvailabilityUtil.parseAvailability(availabilityCode);
      if (!parsedAvailability) {
        this.logger.warn(
          `Invalid availability code "${availabilityCode}" for session "${sessionCode}". Skipping.`,
        );
        continue;
      }

      const sessionKey = `${session.year}${session.trimester}`;
      const existingInstance = existingInstancesMap.get(sessionKey);

      if (existingInstance) {
        // Update only if the availability differs
        if (existingInstance.availability !== parsedAvailability) {
          this.logger.debug(
            `Updating availability for session ${sessionCode}.`,
          );
          await this.updateCourseInstance(existingInstance, parsedAvailability);
        }
      } else {
        const newInstance = await this.createCourseInstance(
          course,
          session,
          parsedAvailability,
        );
        addedInstances.push(newInstance);
      }
    }

    await this.removeOutdatedInstances(
      courseData,
      existingInstancesMap,
      removedInstances,
    );
  }

  private async createCourseInstance(
    course: Course,
    session: Session,
    availability: Availability,
  ): Promise<CourseInstance> {
    return this.courseInstanceService.createCourseInstance({
      course: { connect: { id: course.id } },
      session: {
        connect: {
          year_trimester: {
            year: session.year,
            trimester: session.trimester,
          },
        },
      },
      availability,
    });
  }

  private async updateCourseInstance(
    instance: CourseInstance,
    availability: Availability,
  ): Promise<void> {
    await this.courseInstanceService.updateCourseInstance({
      where: {
        courseId_sessionYear_sessionTrimester: {
          courseId: instance.courseId,
          sessionYear: instance.sessionYear,
          sessionTrimester: instance.sessionTrimester,
        },
      },
      data: { availability },
    });
  }

  private async removeOutdatedInstances(
    courseData: ParsedCourseData,
    existingInstancesMap: Map<string, CourseInstance>,
    removedInstances: CourseInstance[],
  ): Promise<void> {
    for (const [sessionKey, instance] of existingInstancesMap.entries()) {
      if (!courseData.available[sessionKey]) {
        await this.courseInstanceService.deleteCourseInstance({
          courseId_sessionYear_sessionTrimester: {
            courseId: instance.courseId,
            sessionYear: instance.sessionYear,
            sessionTrimester: instance.sessionTrimester,
          },
        });
        removedInstances.push(instance);
      }
    }
  }

  private mapExistingInstancesBySession(
    existingInstances: CourseInstance[],
  ): Map<string, CourseInstance> {
    const instanceMap = new Map<string, CourseInstance>();
    for (const instance of existingInstances) {
      const sessionKey = `${instance.sessionYear}${instance.sessionTrimester}`;
      instanceMap.set(sessionKey, instance);
    }
    return instanceMap;
  }
}
