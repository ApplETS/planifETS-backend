import { Logger } from '@nestjs/common';

import { CourseCodeValidationPipe } from '@/common/pipes/models/course/course-code-validation-pipe';

import { Group, IGroup } from './Group';
import { IHoraireCours } from './horaire-cours.types';
import { Period } from './Period';

export class HoraireCours implements IHoraireCours {
  private static readonly TITLE_FONT_SIZE = 10.998999999999999;
  private static readonly COURS_X_AXIS = 0.551;

  private static readonly courseCodeValidationPipe =
    new CourseCodeValidationPipe();
  private readonly logger = new Logger(HoraireCours.name);

  constructor(
    public code: string = '',
    public title: string = '',
    public prerequisites: string = '',
    public groups: Map<string, Group> = new Map<string, Group>(),
  ) { }

  public addOrUpdateCourse(courses: HoraireCours[]): void {
    const existingCourseIndex = courses.findIndex(
      (course) => course.code === this.code,
    );
    if (existingCourseIndex !== -1) {
      const existingCourse = courses[existingCourseIndex];
      this.groups.forEach((group, groupNumber) => {
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
      this.logger.warn(
        `Periods are empty for course: ${this.code}, group number: ${groupNumber}`,
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

  public serialize() {
    return {
      code: this.code,
      title: this.title,
      prerequisites: this.prerequisites,
      groups: Array.from(this.groups).reduce(
        (acc: { [key: string]: IGroup }, [key, value]) => {
          acc[key] = value.serialize();
          return acc;
        },
        {},
      ),
    };
  }
}
