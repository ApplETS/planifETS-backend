import { Injectable, Logger } from '@nestjs/common';
import { CourseInstance, Program } from '@prisma/client';

import { AvailabilityUtil } from '../../common/utils/course-instance/courseInstanceUtil';
import { PlanificationCoursService } from '../../common/website-helper/pdf/pdf-parser/planification/planification-cours.service';
import { ICoursePlanification } from '../../common/website-helper/pdf/pdf-parser/planification/planification-cours.types';
import { CourseService } from '../../course/course.service';
import { CourseInstanceService } from '../../course-instance/course-instance.service';
import { seedProgramPlanificationPdfParserFlags } from '../../prisma/programs.seeder';
import { ProgramService } from '../../program/program.service';
import { SessionService } from '../../session/session.service';

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
    const updatedInstances: CourseInstance[] = [];
    const removedInstances: CourseInstance[] = [];

    for (const courseData of parsedData) {
      await this.processCourse(
        courseData,
        addedInstances,
        updatedInstances,
        removedInstances,
      );
    }

    this.logger.log(
      `Program ${program.code}: Added ${addedInstances.length} instances, Updated ${updatedInstances.length} instances, Removed ${removedInstances.length} instances.`,
    );
  }

  private async processCourse(
    courseData: ICoursePlanification,
    addedInstances: CourseInstance[],
    updatedInstances: CourseInstance[],
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

      const parsedAvailabilities =
        AvailabilityUtil.parseAvailability(availabilityCode);
      if (!parsedAvailabilities || parsedAvailabilities.length === 0) {
        this.logger.warn(
          `Invalid availability code "${availabilityCode}" for session "${sessionCode}". Skipping.`,
        );
        continue;
      }

      const sessionKey = `${session.year}-${session.trimester}`;
      const existingInstance = existingInstancesMap.get(sessionKey);

      if (existingInstance) {
        // Compare existing availability with parsedAvailabilities
        const isSame = AvailabilityUtil.areAvailabilitiesEqual(
          existingInstance.availability,
          parsedAvailabilities,
        );

        if (!isSame) {
          this.logger.debug(
            `Updating availability for session ${sessionCode}.`,
          );
          await this.courseInstanceService.updateCourseInstanceAvailability(
            existingInstance,
            parsedAvailabilities,
          );
          updatedInstances.push(existingInstance);
        }
        // If same, do nothing
      } else {
        // Create new instance
        const newInstance =
          await this.courseInstanceService.createCourseInstance(
            course,
            session,
            parsedAvailabilities,
          );
        addedInstances.push(newInstance);
      }
    }

    // Handle removal of outdated instances
    await this.removeOutdatedInstances(
      courseData,
      existingInstancesMap,
      removedInstances,
    );
  }

  private async removeOutdatedInstances(
    courseData: ICoursePlanification,
    existingInstancesMap: Map<string, CourseInstance>,
    removedInstances: CourseInstance[],
  ): Promise<void> {
    for (const [sessionKey, instance] of existingInstancesMap.entries()) {
      // Check if this session is present in the new parsed data
      const isSessionPresent = Object.keys(courseData.available).some(
        async (sessionCode) => {
          const session =
            await this.sessionService.getOrCreateSessionFromCode(sessionCode);
          if (!session) return false;
          const key = `${session.year}-${session.trimester}`;
          return key === sessionKey;
        },
      );

      // Since 'some' with async doesn't work as expected, refactor logic
      let sessionFound = false;
      for (const sessionCode of Object.keys(courseData.available)) {
        const session =
          await this.sessionService.getOrCreateSessionFromCode(sessionCode);
        if (session) {
          const key = `${session.year}-${session.trimester}`;
          if (key === sessionKey) {
            sessionFound = true;
            break;
          }
        }
      }

      if (!sessionFound) {
        // Session is no longer present in the new data, delete the instance
        this.logger.debug(
          `Removing outdated CourseInstance for session key ${sessionKey}.`,
        );
        await this.courseInstanceService.deleteCourseInstance(
          instance.courseId,
          instance.sessionYear,
          instance.sessionTrimester,
        );
        removedInstances.push(instance);
      }
    }
  }

  private mapExistingInstancesBySession(
    existingInstances: CourseInstance[],
  ): Map<string, CourseInstance> {
    const instanceMap = new Map<string, CourseInstance>();
    for (const instance of existingInstances) {
      const sessionKey = `${instance.sessionYear}-${instance.sessionTrimester}`;
      instanceMap.set(sessionKey, instance);
    }
    return instanceMap;
  }
}
