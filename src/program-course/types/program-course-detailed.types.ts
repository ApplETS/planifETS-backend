import { Session } from '@prisma/client';

export interface ProgramCoursesDetailedQueryResult {
  id: number;
  code: string | null;
  title: string;
  courses: ProgramCourseQueryResult[];
}

export interface ProgramCourseQueryResult {
  courseId: number;
  type: string | null;
  typicalSessionIndex: number | null;
  unstructuredPrerequisite: string | null;
  course: CourseDetailsQueryResult;
  prerequisites: CoursePrerequisiteQueryResult[];
}

export interface CourseDetailsQueryResult {
  code: string;
  title: string;
  credits: number | null;
  courseInstances: CourseInstanceQueryResult[];
}

export interface CourseInstanceQueryResult {
  availability: string | string[];
  sessionYear: number;
  sessionTrimester: string;
  session: Session;
}

export interface CoursePrerequisiteQueryResult {
  prerequisite: {
    course: {
      code: string;
      title: string;
    };
  };
}
