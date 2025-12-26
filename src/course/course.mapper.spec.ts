
import { Availability, Trimester } from '@prisma/client';

import * as sessionUtil from '../common/utils/session/sessionUtil';
import { CourseMapper } from './course.mapper';
import { CourseSearchResult } from './course.types';


describe('CourseMapper', () => {
  const mockGetTrimesterPrefix = jest.fn();

  beforeAll(() => {
    jest.spyOn(sessionUtil, 'getTrimesterPrefix').mockImplementation(mockGetTrimesterPrefix);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const baseCourseInstance = {
    session: {
      createdAt: new Date(),
      updatedAt: new Date(),
      trimester: Trimester.AUTOMNE,
      year: 2025,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    courseId: 1,
    sessionYear: 2025,
    sessionTrimester: Trimester.AUTOMNE,
    availability: [Availability.JOUR],
  };

  const baseCourse = {
    id: '1',
    code: 'INF101',
    title: 'Intro to CS',
    credits: 3,
    cycle: 'undergrad',
    createdAt: new Date(),
    updatedAt: new Date(),
    courseInstances: [baseCourseInstance],
    programs: [
      {
        typicalSessionIndex: 2,
        type: 'mandatory',
        unstructuredPrerequisite: 'None',
        prerequisites: [
          {
            prerequisite: {
              course: {
                id: '2',
                code: 'MAT101',
                title: 'Math',
                credits: 3,
                cycle: 'undergrad',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
          },
        ],
      },
    ],
  } as unknown as CourseSearchResult;

  it('should map to SearchCourseResult with programCodes', () => {
    mockGetTrimesterPrefix.mockReturnValue('A');
    const result = CourseMapper.toSearchDto(baseCourse, ['INF']);
    expect(result).toMatchObject({
      id: '1',
      code: 'INF101',
      title: 'Intro to CS',
      credits: 3,
      cycle: 'undergrad',
      sessionAvailability: [
        {
          sessionCode: 'A2025',
          availability: [Availability.JOUR],
        },
      ],
      prerequisites: [
        {
          id: '2',
          code: 'MAT101',
          title: 'Math',
          credits: 3,
          cycle: 'undergrad',
        },
      ],
      typicalSessionIndex: 2,
      type: 'mandatory',
      unstructuredPrerequisite: 'None',
    });
  });

  it('should map to SearchCourseResult without programCodes', () => {
    mockGetTrimesterPrefix.mockReturnValue('A');
    const result = CourseMapper.toSearchDto(baseCourse);
    expect(result).not.toHaveProperty('typicalSessionIndex');
    expect(result).not.toHaveProperty('type');
    expect(result).not.toHaveProperty('unstructuredPrerequisite');
  });

  it('should handle empty programs and courseInstances', () => {
    const course = { ...baseCourse, programs: [], courseInstances: [] };
    const result = CourseMapper.toSearchDto(course);
    expect(result.sessionAvailability).toEqual([]);
    expect(result.prerequisites).toEqual([]);
    expect(result.typicalSessionIndex).toBeUndefined();
  });

  it('should deduplicate sessionAvailability by session', () => {
    mockGetTrimesterPrefix.mockReturnValue('A');
    const course = {
      ...baseCourse,
      courseInstances: [
        { ...baseCourseInstance },
        { ...baseCourseInstance },
      ],
    };
    const result = CourseMapper.toSearchDto(course);
    expect(result.sessionAvailability.length).toBe(1);
  });
});
