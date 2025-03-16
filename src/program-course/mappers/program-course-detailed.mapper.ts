import { getTrimesterPrefix } from '../../common/utils/session/sessionUtil';
import {
  CourseDetailedDto,
  CoursePrerequisiteDto,
  ProgramCoursesDetailedDto,
  SessionAvailabilityDto,
} from '../dtos/program-course-detailed.dto';
import {
  CourseInstanceQueryResult,
  CoursePrerequisiteQueryResult,
  ProgramCourseQueryResult,
  ProgramCoursesDetailedQueryResult,
} from '../types/program-course-detailed.types';

export class ProgramCourseDetailedMapper {
  public static toDto(
    programs: ProgramCoursesDetailedQueryResult[],
  ): ProgramCoursesDetailedDto[] {
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
  ): CourseDetailedDto {
    return {
      code: pCourse.course.code,
      title: pCourse.course.title,
      credits: pCourse.course.credits || 0,
      sessions: Object.values(
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
