export interface ProgramCoursesDto {
  programCode: string;
  programTitle: string;
  courses: ProgramCourseDto[];
}

export interface ProgramCourseDto {
  code: string;
  title: string;
  credits: number;
  sessionAvailability: SessionAvailabilityDto[];
  prerequisites: CoursePrerequisiteDto[];
  type: string | null;
  typicalSessionIndex: number | null;
  unstructuredPrerequisite: string | null;
}

export interface SessionAvailabilityDto {
  sessionCode: string;
  availability: string[];
}

export interface CoursePrerequisiteDto {
  code: string;
  title: string;
}

export interface DetailedProgramCourseDto {
  courseId: number;
  programId: number;
  type: string | null;
  typicalSessionIndex: number | null;
  unstructuredPrerequisite: string | null;
  course: {
    code: string;
    title: string;
    credits: number | null;
    description: string;
    cycle: number | null;
    courseInstances: {
      availability: string[];
      sessionYear: number;
      sessionTrimester: string;
      session: {
        trimester: string;
        year: number;
      };
    }[];
  };
  prerequisites: {
    prerequisite: {
      course: {
        code: string;
        title: string;
      };
    };
  }[];
}
