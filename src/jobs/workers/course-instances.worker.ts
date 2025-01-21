import { Injectable, Logger } from '@nestjs/common';
import { Availability, Course, CourseInstance, Session } from '@prisma/client';

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
    for (const program of programs) {
      if (!program.code) {
        this.logger.warn(`Program ${program.id} has no code. Skipping.`);
        continue;
      }
      this.logger.log(`Processing program: ${program.code}`);

      const parsedData =
        await this.planificationCourseService.parseProgramPlanification(
          program.code,
        );
      allParsedData.push(...parsedData);
    }

    // Process all parsed data together
    await this.processAllParsedData(allParsedData);

    this.logger.log('Completed processCourseInstances job.');
  }

  private async processAllParsedData(
    allParsedData: ICoursePlanification[],
  ): Promise<void> {
    const { sessionCodesSet, courseCodesSet } =
      this.extractUniqueCodes(allParsedData);

    const sessionCodeToSessionMap = await this.fetchSessions(sessionCodesSet);
    const courseCodeToCourseMap = await this.fetchCourses(courseCodesSet);

    const requiredInstancesMap = this.buildRequiredInstancesMap(
      allParsedData,
      courseCodeToCourseMap,
      sessionCodeToSessionMap,
    );

    const existingInstancesMap = await this.fetchExistingInstancesMap();

    const { addedCount, updatedCount } = await this.processRequiredInstances(
      requiredInstancesMap,
      existingInstancesMap,
      courseCodeToCourseMap,
      sessionCodeToSessionMap,
    );

    const deletedCount =
      await this.deleteObsoleteInstances(existingInstancesMap);

    this.logger.log(
      `Total Added ${addedCount} instances. Updated ${updatedCount} instances. Deleted ${deletedCount} instances.`,
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
    sessionCodesSet: Set<string>,
  ): Promise<Map<string, Session>> {
    const sessionCodeToSessionMap = new Map<string, Session>();
    for (const sessionCode of sessionCodesSet) {
      const session =
        await this.sessionService.getOrCreateSessionFromCode(sessionCode);
      sessionCodeToSessionMap.set(sessionCode, session);
    }
    return sessionCodeToSessionMap;
  }

  private async fetchCourses(
    courseCodesSet: Set<string>,
  ): Promise<Map<string, Course>> {
    const courses = await this.courseService.getCoursesByCodes(
      Array.from(courseCodesSet),
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
    sessionCodeToSessionMap: Map<string, Session>,
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
        this.logger.warn(`Course ${courseData.code} not found. Skipping.`);
        continue;
      }

      for (const [sessionCode, availabilityCode] of Object.entries(
        courseData.available,
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
            `Invalid availability code "${availabilityCode}" for course "${courseData.code}" in session "${sessionCode}". Skipping.`,
          );
          continue;
        }

        const key = this.generateInstanceKey(
          course.id,
          session.year,
          session.trimester,
        );
        requiredInstancesMap.set(key, {
          courseId: course.id,
          courseCode: course.code,
          sessionYear: session.year,
          sessionTrimester: session.trimester,
          sessionCode: sessionCode,
          availability: parsedAvailabilities,
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
        instance.sessionTrimester,
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
  ): Promise<{ addedCount: number; updatedCount: number }> {
    let addedCount = 0;
    let updatedCount = 0;

    for (const [key, requiredInstance] of requiredInstancesMap.entries()) {
      const existingInstance = existingInstancesMap.get(key);

      const course = courseCodeToCourseMap.get(requiredInstance.courseCode);
      const session = sessionCodeToSessionMap.get(requiredInstance.sessionCode);

      if (!session || !course) {
        this.logger.warn(
          `Session or course not found for key ${key}. Skipping.`,
        );
        continue;
      }

      if (existingInstance) {
        // Compare and update availability if different
        const isSame = AvailabilityUtil.areAvailabilitiesEqual(
          existingInstance.availability,
          requiredInstance.availability,
        );
        if (!isSame) {
          await this.courseInstanceService.updateCourseInstanceAvailability(
            existingInstance,
            requiredInstance.availability,
          );
          updatedCount++;
        }
        // Remove from existingInstancesMap to mark as processed
        existingInstancesMap.delete(key);
      } else {
        // Create new CourseInstance
        await this.courseInstanceService.createCourseInstance(
          course,
          session,
          requiredInstance.availability,
        );
        addedCount++;
      }
    }
    return { addedCount, updatedCount };
  }

  private async deleteObsoleteInstances(
    existingInstancesMap: Map<string, CourseInstance>,
  ): Promise<number> {
    let deletedCount = 0;
    for (const instance of existingInstancesMap.values()) {
      await this.courseInstanceService.deleteCourseInstance(
        instance.courseId,
        instance.sessionYear,
        instance.sessionTrimester,
      );
      deletedCount++;
    }
    return deletedCount;
  }

  private generateInstanceKey(
    courseId: number,
    sessionYear: number,
    sessionTrimester: string,
  ): string {
    return `${courseId}-${sessionYear}-${sessionTrimester}`;
  }
}
