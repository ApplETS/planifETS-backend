import { CourseCodeValidationPipe } from '../../pipes/course-code-validation-pipe';
import { Group } from './Group';
import { IHoraireCours } from './horaire-cours.types';
import { Period } from './Period';

export class HoraireCours implements IHoraireCours {
  private static readonly TITLE_FONT_SIZE = 10.998999999999999;
  private static readonly COURS_X_AXIS = 0.551;

  private static courseCodeValidationPipe = new CourseCodeValidationPipe();

  constructor(
    public code: string = '',
    public title: string = '',
    public prerequisites: string = '',
    public groups: Map<string, Group> = new Map<string, Group>(),
  ) {}

  public addOrUpdateCourse(courses: HoraireCours[]): void {
    const existingCourseIndex = courses.findIndex(
      (course) => course.code === this.code,
    );
    if (existingCourseIndex !== -1) {
      const existingCourse = courses[existingCourseIndex];
      Object.entries(this.groups).forEach(([groupNumber, group]) => {
        if (!existingCourse.groups.get(groupNumber)) {
          existingCourse.groups.set(groupNumber, new Group());
        } else {
          existingCourse.groups.get(groupNumber)!.addPeriods(group.periods);
        }
      });
    } else {
      courses.push(this);
    }
  }

  public finalizeGroup(groupNumber: string, periods: Period[]): void {
    if (!this.groups.get(groupNumber)) {
      this.groups.set(groupNumber, new Group());
    }
    if (periods.length > 0) {
      this.groups.get(groupNumber)!.addPeriods(periods);
    } else {
      console.error(
        'Periods are empty for course: ',
        this.code,
        ', group number: ',
        groupNumber,
      );
    }
  }

  public static isCourseCode(text: string, xPos: number): boolean {
    return (
      Boolean(this.courseCodeValidationPipe.transform(text)) &&
      xPos === this.COURS_X_AXIS
    );
  }

  public static isTitle(text: string, fontSize: number): boolean {
    return (
      fontSize === this.TITLE_FONT_SIZE &&
      text == text.toUpperCase() &&
      text != text.toLowerCase()
    );
  }
}
