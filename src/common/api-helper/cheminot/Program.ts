import { Course } from './Course';

export class Program {
  private id: number;
  private courses: Course[];

  constructor(id: number, courses: Course[]) {
    this.id = id;
    this.courses = courses;
  }

  public addCourse(course: Course) {
    this.courses.push(course);
  }
}
