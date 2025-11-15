import { getTrimesterPrefix } from '@/common/utils/session/sessionUtil';

import {
  CoursePrerequisiteDto,
  ProgramCourseDto,
  ProgramCoursesDto,
  SessionAvailabilityDto,
} from '../dtos/program-course.dto';
import {
  CourseInstanceQueryResult,
  CoursePrerequisiteQueryResult,
  ProgramCourseQueryResult,
  ProgramCoursesQueryResult,
} from '../types/program-course.types';

export class ProgramCourseMapper {
  public static toDto(
    programs: ProgramCoursesQueryResult[],
  ): ProgramCoursesDto[] {
    return programs.map((program) => ({
      programCode: program.code || '',
      programTitle: program.title,
      courses: program.courses.map((pCourse: ProgramCourseQueryResult) =>
        this.toCourseDto(pCourse),
      ),
    }));
  }

  private static toCourseDto(
    pCourse: ProgramCourseQueryResult,
  ): ProgramCourseDto {
    return {
      code: pCourse.course.code,
      title: pCourse.course.title,
      credits: pCourse.course.credits || 0,
      sessionAvailability: Object.values(
        this.mapSessionAvailabilities(pCourse.course.courseInstances),
      ),
      prerequisites: this.mapPrerequisites(pCourse.prerequisites),
      type: pCourse.type,
      typicalSessionIndex: pCourse.typicalSessionIndex,
      unstructuredPrerequisite: pCourse.unstructuredPrerequisite,
    };
  }

  private static mapPrerequisites(
    prerequisites: CoursePrerequisiteQueryResult[],
  ): CoursePrerequisiteDto[] {
    return prerequisites.map((prereq) => ({
      code: prereq.prerequisite.course.code,
      title: prereq.prerequisite.course.title,
    }));
  }

  private static mapSessionAvailabilities(
    courseInstances: CourseInstanceQueryResult[],
  ): Record<string, SessionAvailabilityDto> {
    return courseInstances.reduce<Record<string, SessionAvailabilityDto>>(
      (acc, courseI) => {
        const sessionKey = `${courseI.sessionYear}-${courseI.sessionTrimester}`;

        if (!acc[sessionKey]) {
          const trimesterPrefix = getTrimesterPrefix(courseI.sessionTrimester);

          acc[sessionKey] = {
            sessionCode: `${trimesterPrefix}${courseI.sessionYear}`,
            availability: Array.isArray(courseI.availability)
              ? courseI.availability
              : [courseI.availability],
          };
        }

        return acc;
      },
      {},
    );
  }
}
