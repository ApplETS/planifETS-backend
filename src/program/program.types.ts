export type ProgramIncludeCourseIdsAndPrerequisitesDto = {
  id: number;
  code: string | null;
  courses: {
    course: {
      id: number;
      code: string;
    };
    typicalSessionIndex: number | null;
    type: string | null;
    prerequisites: {
      prerequisite: {
        course: {
          id: number;
          code: string;
        };
      };
    }[];
  }[];
};
