import { ProgramCourseMapper } from '../../../src/program-course/mappers/program-course.mapper';
import {
  CourseInstanceQueryResult,
  CoursePrerequisiteQueryResult,
  ProgramCourseQueryResult,
  ProgramCoursesQueryResult,
} from '../../../src/program-course/types/program-course.types';

describe('ProgramCourseMapper', () => {
  describe('toDto', () => {
    it('should map programs to ProgramCoursesDto[]', () => {
      const input: ProgramCoursesQueryResult[] = [
        {
          id: 10,
          code: '123',
          title: 'Program Title',
          courses: [
            {
              courseId: 1,
              type: 'obligatoire',
              typicalSessionIndex: 1,
              unstructuredPrerequisite: null,
              course: {
                id: 100,
                code: 'C101',
                title: 'Course 101',
                credits: 3,
                cycle: 1,
                courseInstances: [
                  {
                    sessionYear: 2025,
                    sessionTrimester: 'A',
                    availability: ['JOUR'],
                  } as CourseInstanceQueryResult,
                ],
              },
              prerequisites: [
                {
                  prerequisite: {
                    course: {
                      id: 2,
                      code: 'C102',
                      title: 'Course 102',
                      credits: 2,
                      cycle: 1,
                    },
                  },
                } as CoursePrerequisiteQueryResult,
              ],
            } as ProgramCourseQueryResult,
          ],
        },
      ];

      const result = ProgramCourseMapper.toDto(input);
      expect(result).toHaveLength(1);
      expect(result[0].programCode).toBe('123');
      expect(result[0].programTitle).toBe('Program Title');
      expect(result[0].courses).toHaveLength(1);
      expect(result[0].courses[0].code).toBe('C101');
      expect(result[0].courses[0].prerequisites[0].code).toBe('C102');
      expect(result[0].courses[0].sessionAvailability[0].sessionCode).toContain('A2025');
    });
  });

  describe('private methods', () => {
    it('should map prerequisites correctly', () => {
      const prerequisites: CoursePrerequisiteQueryResult[] = [
        {
          prerequisite: {
            course: {
              id: 3,
              code: 'C103',
              title: 'Course 103',
              credits: 4,
              cycle: 2,
            },
          },
        } as CoursePrerequisiteQueryResult,
      ];
      // @ts-expect-error: Accessing private static method for test coverage
      const result = ProgramCourseMapper.mapPrerequisites(prerequisites);
      expect(result).toEqual([
        {
          id: 3,
          code: 'C103',
          title: 'Course 103',
          credits: 4,
          cycle: 2,
        },
      ]);
    });

    it('should map session availabilities correctly', () => {
      const courseInstances: CourseInstanceQueryResult[] = [
        {
          sessionYear: 2024,
          sessionTrimester: 'H',
          availability: 'JOUR',
        } as CourseInstanceQueryResult,
        {
          sessionYear: 2024,
          sessionTrimester: 'A',
          availability: ['SOIR'],
        } as CourseInstanceQueryResult,
      ];
      // @ts-expect-error: Accessing private static method for test coverage
      const result = ProgramCourseMapper.mapSessionAvailabilities(courseInstances);
      expect(result['2024-H'].sessionCode).toContain('H2024');
      expect(result['2024-A'].availability).toEqual(['SOIR']);
    });
  });
});
