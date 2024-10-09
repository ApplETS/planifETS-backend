import { Course } from './Course';

export class Program {
  private readonly horsProgramme: string[] = [];

  constructor(
    public code: string,
    public courses: Course[],
    public choix?: Course[],
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

    const code = parts[1];
    return new Program(code, []);
  }

  public getCourses(): Course[] {
    return this.courses;
  }

  public getHorsProgramme(): string[] {
    return this.horsProgramme;
  }

  public addCourse(course: Course) {
    if (course.type === 'CHOIX') {
      this.addChoixCourse(course);
    } else {
      this.courses.push(course);
    }
  }

  private addChoixCourse(course: Course) {
    if (!this.choix) {
      this.choix = [];
    }
    this.choix.push(course);
  }

  public addHorsProgrammeCourse(courseCode: string) {
    this.horsProgramme.push(courseCode);
  }
}
