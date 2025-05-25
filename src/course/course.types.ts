import { Prisma } from '@prisma/client';

export type CourseSearchResult = Prisma.CourseGetPayload<{
  include: {
    courseInstances: {
      include: { session: true };
      orderBy: [{ sessionYear: 'desc' }, { sessionTrimester: 'desc' }];
    };
    programs: {
      where: { program: { code: string } };
      include: {
        prerequisites: {
          include: {
            prerequisite: {
              include: { course: true };
            };
          };
        };
      };
    };
  };
}>;
