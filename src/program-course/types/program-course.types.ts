import { Course, ProgramCourse } from '@prisma/client';

export interface ProgramCourseWithPrerequisites extends ProgramCourse {
  prerequisites?: {
    prerequisite: ProgramCourse & {
      course: Course;
    };
  }[];
}
