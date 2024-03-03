import { CourseCodeValidationPipe } from '../../pipes/course-code-validation-pipe';
import { Group } from './Group';
import { Period } from './Period';

interface IHoraireCours {
  code: string;
  title: string;
  prerequisites: string;
  groups: { [groupNumber: string]: Group };
}

export class HoraireCours implements IHoraireCours {
  private static readonly TITLE_FONT_SIZE = 10.998999999999999;
  private static readonly COURS_X_AXIS = 0.551;

  private static courseCodeValidationPipe = new CourseCodeValidationPipe();

  constructor(
    public code: string = '',
    public title: string = '',
    public prerequisites: string = '',
    public groups: { [groupNumber: string]: Group } = {},
  ) {}

  public addOrUpdateCourse(courses: HoraireCours[]): void {
    const existingCourseIndex = courses.findIndex(
      (course) => course.code === this.code,
    );
    if (existingCourseIndex !== -1) {
      const existingCourse = courses[existingCourseIndex];
      Object.entries(this.groups).forEach(([groupNumber, group]) => {
        if (!existingCourse.groups[groupNumber]) {
          existingCourse.groups[groupNumber] = new Group();
        }
        existingCourse.groups[groupNumber].addPeriods(group.periods);
      });
    } else {
      courses.push(this);
    }
  }

  public finalizeGroup(groupNumber: string, periods: Period[]): void {
    if (!this.groups[groupNumber]) {
      this.groups[groupNumber] = new Group();
    }
    if (periods.length > 0) {
      this.groups[groupNumber].addPeriods(periods);
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
