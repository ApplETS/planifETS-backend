export interface SessionAvailabilityDto {
  sessionCode: string;
  availability: string[];
}

export interface PrerequisiteResult {
  id: number;
  code: string;
  title: string;
  credits: number | null;
  cycle: number | null;
}

export interface SearchCourseResult {
  id: number;
  code: string;
  title: string;
  credits: number | null;
  cycle: number | null;
  sessionAvailability: SessionAvailabilityDto[];
  typicalIndex?: number | null;
  prerequisites?: PrerequisiteResult[];
}

export interface SearchCoursesDto {
  courses: SearchCourseResult[];
  total: number;
  hasMore: boolean;
}
