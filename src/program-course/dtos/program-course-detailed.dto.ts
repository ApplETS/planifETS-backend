export interface ProgramCoursesDetailedDto {
  programCode: string;
  programTitle: string;
  courses: CourseDetailedDto[];
}

export interface CourseDetailedDto {
  code: string;
  title: string;
  credits: number;
  sessions: SessionAvailabilityDto[];
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
