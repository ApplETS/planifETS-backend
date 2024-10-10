import { CourseCodeValidationPipe } from '../../pipes/models/course/course-code-validation-pipe';

export class Course {
  public static readonly COURSE_LINE_PARTS_COUNT = 11;
  public static readonly INTERNSHIP_LINE_PARTS_COUNT = 12;

  private static readonly courseCodeValidationPipe =
    new CourseCodeValidationPipe();

  constructor(
    public type: string,
    public session: number,
    public code: string,
    public concentration: string,
    public category: string,
    public level: string,
    public mandatory: boolean,
    public prerequisites: { profile: string; prerequisites: string[] }[] = [],
    public alternatives?: string[], // For CHOIX courses
  ) {}

  public static isCourseLine(line: string): boolean {
    return (
      !line.startsWith('.COURS') &&
      line.trim().length >= this.COURSE_LINE_PARTS_COUNT
    );
  }

  public static parseCourseLine(line: string): Course | null {
    line = line.trim();
    const parts = line.split(',');

    // Handle "CHOIX" type courses
    if (parts[0] === 'CHOIX') {
      const mainCourseCode = parts[3].trim().toUpperCase();
      const alternatives = parts[10]
        .split(' ')
        .map((course) => course.trim().toUpperCase());

      return new Course(
        parts[0],
        parseInt(parts[1], 10),
        mainCourseCode,
        parts[5].trim(),
        parts[6].trim(),
        parts[7].trim(),
        parts[8] === 'B',
        [], // CHOIX courses have no prerequisites
        [mainCourseCode, ...alternatives],
      );
    }

    // Handle regular courses (PROFI, TRONC, etc.)
    if (parts.length < this.COURSE_LINE_PARTS_COUNT) {
      return null;
    }

    const type = parts[0];
    const session = parseInt(parts[1], 10);
    const code = parts[3].toUpperCase();
    const profile = parts[4].trim();
    const concentration = parts[5].trim();
    const category = parts[6].trim();
    const level = parts[7].trim();
    const mandatory = parts[8] === 'B';
    const prereqList = Course.parsePrerequisites(parts[9]);

    // Only add non-empty prerequisites for the profile
    const prerequisites =
      prereqList.length > 0 ? [{ profile, prerequisites: prereqList }] : [];

    return new Course(
      type,
      session,
      code,
      concentration,
      category,
      level,
      mandatory,
      prerequisites,
    );
  }

  public static parsePrerequisites(prerequisitesString: string): string[] {
    if (!prerequisitesString) return [];
    return prerequisitesString
      .split(' & ')
      .map((prerequisite) => prerequisite.trim().toUpperCase());
  }
}
