import { Course } from './Course';

export class Program {
  constructor(
    private id: number,
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

    const id = parseInt(parts[1], 10);
    return new Program(id, []);
  }

  public getCourses(): Course[] {
    return this.courses;
  }

  public addCourse(course: Course) {
    this.courses.push(course);
  }
}
