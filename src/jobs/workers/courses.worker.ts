import { Injectable, Logger } from '@nestjs/common';
import { Course } from '@prisma/client';

import { EtsApiService } from '@/common/api-helper/ets/course/ets-api.service';
import { EtsPlanETSService } from '@/common/api-helper/ets/course/ets-planets.service';
import { EtsWebsiteService } from '@/common/api-helper/ets/course/ets-website.service';

import { CourseService } from '../../course/course.service';

@Injectable()
export class CoursesJobService {
  // 5 concurrent courses per 600ms stayed below the ETS site's 403 threshold in practice.
  private static readonly DESCRIPTION_SYNC_BATCH_SIZE = 5;
  private static readonly COURSE_DESCRIPTION_SYNC_BATCH_DELAY_MS = 600;

  private readonly logger = new Logger(CoursesJobService.name);

  constructor(
    private readonly etsApiService: EtsApiService,
    private readonly etsWebsiteService: EtsWebsiteService,
    private readonly etsPlanetsService: EtsPlanETSService,
    private readonly courseService: CourseService
  ) {}

  public async processCourses(): Promise<void> {
    this.logger.log('Processing courses...');
    const courses = await this.etsApiService.fetchAllCoursesWithCredits();
    if (!courses.length) {
      this.logger.error('No courses fetched.');
      throw new Error('No courses fetched.');
    }
    await this.courseService.upsertCourses(courses);
  }

  public async syncCourseDescriptionsFromEtsWebsite(): Promise<void> {
    this.logger.log('Syncing course descriptions from ETS website...');

    const courses = await this.courseService.getCoursesForDescriptionSync();
    let skippedCount = 0;

    const coursesWithCodes: typeof courses = [];

    for (const course of courses) {
      if (!course.code?.trim()) {
        skippedCount += 1;
        this.logger.warn(
          `Skipping course description sync for course ${course.id}: missing course code.`
        );
        continue;
      }
      coursesWithCodes.push(course);
    }

    const firstPass = await this.processCourseBatches(
      coursesWithCodes,
      (code) =>
        this.etsWebsiteService.fetchCourseDescriptionFromEtsWebsite(code)
    );
    let updatedCount = firstPass.updatedCount;
    let failedCourseCodes = firstPass.failedCourseCodes;

    if (failedCourseCodes.length > 0) {
      const coursesByCode = new Map(
        coursesWithCodes.map((course) => [course.code, course])
      );
      const coursesToRetry = failedCourseCodes.map(
        (code) => coursesByCode.get(code)!
      );

      this.logger.debug(
        `Retrying description sync for ${coursesToRetry.length} failed courses via PlanETS...`
      );
      const retryPass = await this.processCourseBatches(
        coursesToRetry,
        (code) => this.etsPlanetsService.fetchCourseDescriptionFromPlanETS(code)
      );

      updatedCount += retryPass.updatedCount;
      failedCourseCodes = retryPass.failedCourseCodes;
    }

    this.logger.log(
      `Course description sync completed. Processed ${courses.length} courses, updated ${updatedCount}, skipped ${skippedCount}, failed ${failedCourseCodes.length}.`
    );

    if (failedCourseCodes.length > 0) {
      this.logger.warn(
        `Failed to sync descriptions for courses because they could not be found on the ETS website or their description could not be extracted: [${failedCourseCodes.join(', ')}]`
      );
    }
  }

  private async processCourseBatches(
    courses: Array<Pick<Course, 'id' | 'code' | 'description'>>,
    fetchDescription: (courseCode: string) => Promise<string>
  ): Promise<{ updatedCount: number; failedCourseCodes: string[] }> {
    let updatedCount = 0;
    const failedCourseCodes: string[] = [];

    for (
      let index = 0;
      index < courses.length;
      index += CoursesJobService.DESCRIPTION_SYNC_BATCH_SIZE
    ) {
      const batch = courses.slice(
        index,
        index + CoursesJobService.DESCRIPTION_SYNC_BATCH_SIZE
      );
      const results = await Promise.allSettled(
        batch.map((course) => fetchDescription(course.code))
      );
      const coursesToUpdate: Array<
        Pick<Course, 'id' | 'code' | 'description'>
      > = [];
      const failedCoursesByError = new Map<string, string[]>();

      results.forEach((result, resultIndex) => {
        const course = batch[resultIndex];

        if (result.status === 'fulfilled') {
          if (result.value !== course.description) {
            coursesToUpdate.push({
              id: course.id,
              code: course.code,
              description: result.value
            });
          }
          return;
        }

        const errorMessage =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        const courseCodes = failedCoursesByError.get(errorMessage) ?? [];

        courseCodes.push(course.code);
        failedCoursesByError.set(errorMessage, courseCodes);
      });

      if (coursesToUpdate.length > 0) {
        await this.courseService.updateCourseDescriptionsBatch(coursesToUpdate); // NOSONAR: batches run sequentially to bound database load
        updatedCount += coursesToUpdate.length;
      }

      failedCoursesByError.forEach((courseCodes) => {
        failedCourseCodes.push(...courseCodes);
      });

      const processed = Math.min(
        index + CoursesJobService.DESCRIPTION_SYNC_BATCH_SIZE,
        courses.length
      );
      this.logger.debug(
        `Description sync progress: ${processed}/${courses.length} (updated=${updatedCount}, failed=${failedCourseCodes.length})`
      );

      if (
        index + CoursesJobService.DESCRIPTION_SYNC_BATCH_SIZE <
        courses.length
      ) {
        await this.delay(
          CoursesJobService.COURSE_DESCRIPTION_SYNC_BATCH_DELAY_MS
        );
      }
    }

    return { updatedCount, failedCourseCodes };
  }

  private async delay(milliseconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
