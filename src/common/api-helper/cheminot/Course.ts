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
    public profile: string,
    public concentration: string,
    public category: string,
    public level: string,
    public mandatory: boolean,
    public prerequisites: string[],
    public alternatives?: string[],
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
      const alternatives = parts[10]
        .split(' ')
        .map((course) => course.trim().toUpperCase());
      return new Course(
        parts[0],
        parseInt(parts[1], 10),
        parts[3].trim().toUpperCase(),
        parts[4].trim(),
        parts[5].trim(),
        parts[6].trim(),
        parts[7].trim(),
        parts[8] === 'B',
        Course.parsePrerequisites(parts[9]),
        alternatives,
      );
    }

    // If the line has 12 parts, it's an internship, so shift the first part
    if (parts.length === this.INTERNSHIP_LINE_PARTS_COUNT) {
      parts.shift();
    }

    if (parts.length < this.COURSE_LINE_PARTS_COUNT - 1) {
      return null; // Not enough parts to form a valid course
    }

    // Trim all the parts
    parts.forEach((part, i) => {
      parts[i] = part.trim();
    });

    const type = parts[0];
    const session = parseInt(parts[1], 10);
    const code = parts[3].toUpperCase();
    // Validate the course code using the course code validation pipe
    if (this.courseCodeValidationPipe.transform(code) === false) {
      console.log('Invalid course code: ', code);
    }
    const profile = parts[4];
    const concentration = parts[5];
    const category = parts[6];
    const level = parts[7];
    const mandatory = parts[8] === 'B';
    const prerequisites = Course.parsePrerequisites(parts[9]);

    return new Course(
      type,
      session,
      code,
      profile,
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
