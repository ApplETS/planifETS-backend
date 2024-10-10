import { Course } from './Course';

export class Program {
  private readonly horsProgramme: string[] = [];

  constructor(
    public code: string,
    public courses: Course[] = [],
    public choix: Course[] = [],
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
    return new Program(code);
  }

  public getCourses(): Course[] {
    return this.courses;
  }

  public getChoix(): Course[] {
    return this.choix;
  }

  public getHorsProgramme(): string[] {
    return this.horsProgramme;
  }

  public addCourse(newCourse: Course) {
    // Handle "CHOIX" courses separately
    if (newCourse.type === 'CHOIX') {
      this.choix.push(newCourse);
      return;
    }

    // Handle regular courses (non-CHOIX)
    const existingCourseIndex = this.courses.findIndex(
      (course) => course.code === newCourse.code,
    );

    if (existingCourseIndex >= 0) {
      // Merge with an existing course if found
      this.mergeCourse(this.courses[existingCourseIndex], newCourse);
    } else {
      // Otherwise, add it as a new course
      this.courses.push(newCourse);
    }
  }

  private mergeCourse(existingCourse: Course, newCourse: Course) {
    // Merge profiles and prerequisites for duplicate courses
    newCourse.prerequisites.forEach((newProfilePrereqs) => {
      const existingProfile = existingCourse.prerequisites.find(
        (profilePrereqs) =>
          profilePrereqs.profile === newProfilePrereqs.profile,
      );

      if (existingProfile) {
        // Merge prerequisites for the same profile, avoiding duplicates
        newProfilePrereqs.prerequisites.forEach((prereq) => {
          if (!existingProfile.prerequisites.includes(prereq)) {
            existingProfile.prerequisites.push(prereq);
          }
        });
      } else if (newProfilePrereqs.prerequisites.length > 0) {
        // Add a new profile with its prerequisites
        existingCourse.prerequisites.push(newProfilePrereqs);
      }
    });
  }

  public addHorsProgrammeCourse(courseCode: string) {
    this.horsProgramme.push(courseCode);
  }
}
