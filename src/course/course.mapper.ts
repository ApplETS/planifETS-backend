import { getTrimesterPrefix } from '../common/utils/session/sessionUtil';
import { CourseSearchResult } from './course.types';
import {
  PrerequisiteResult,
  SearchCourseResult,
  SessionAvailabilityDto,
} from './dtos/search-course.dto';

export class CourseMapper {
  public static toSearchDto(
    raw: CourseSearchResult,
    programCode?: string,
  ): SearchCourseResult {
    const { id, code, title, credits, cycle } = raw;

    return {
      id,
      code,
      title,
      credits,
      cycle,
      sessionAvailability: this.mapSessionAvailabilities(raw.courseInstances),
      ...(programCode
        ? {
            typicalIndex: this.getTypicalIndex(raw.programs),
            prerequisites: this.mapPrerequisites(raw.programs),
          }
        : {}),
    };
  }

  private static mapSessionAvailabilities(
    instances: CourseSearchResult['courseInstances'],
  ): SessionAvailabilityDto[] {
    const bySession: Record<string, SessionAvailabilityDto> = {};

    instances.forEach((inst) => {
      const key = `${inst.sessionYear}-${inst.sessionTrimester}`;
      if (!bySession[key]) {
        const prefix = getTrimesterPrefix(inst.sessionTrimester);
        bySession[key] = {
          sessionCode: `${prefix}${inst.sessionYear}`,
          availability: inst.availability,
        };
      }
    });

    return Object.values(bySession);
  }

  private static getTypicalIndex(
    programs: CourseSearchResult['programs'],
  ): number | null {
    return programs[0]?.typicalSessionIndex ?? null;
  }

  private static mapPrerequisites(
    programs: CourseSearchResult['programs'],
  ): PrerequisiteResult[] {
    const prereqs = programs[0]?.prerequisites ?? [];
    return prereqs.map((p) => {
      const c = p.prerequisite.course;
      return {
        id: c.id,
        code: c.code,
        title: c.title,
        credits: c.credits,
        cycle: c.cycle,
      };
    });
  }
}
