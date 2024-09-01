import { Course } from './Course';

export class Program {
  private horsProgramme: string[] = [];

  constructor(
    private code: number,
    private courses: Course[],
  ) {}

  public static isProgramLine(line: string): boolean {
    return line.startsWith('.PROGRAMME');
  }

  public static parseProgramLine(line: string): Program | null {
    const regex = /\.PROGRAMME (\d+)/;
    const parts = regex.exec(line);

    if (!parts) {
      return null;
    }

    const code = parseInt(parts[1], 10);
    return new Program(code, []);
  }

  public getCourses(): Course[] {
    return this.courses;
  }

  public getHorsProgramme(): string[] {
    return this.horsProgramme;
  }

  public addCourse(course: Course) {
    this.courses.push(course);
  }

  public addHorsProgrammeCourse(courseCode: string) {
    this.horsProgramme.push(courseCode);
  }
}
