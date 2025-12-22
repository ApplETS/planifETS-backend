import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { of } from 'rxjs';

import {
  EtsCourseService,
} from '@/common/api-helper/ets/course/ets-course.service';

describe('EtsCourseService', () => {
  let service: EtsCourseService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EtsCourseService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EtsCourseService>(EtsCourseService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should fetch all courses', async () => {
    // Mock for fetchAllCoursesWithoutCredits
    const mockCoursesWithoutCredits = [
      { id: 1, title: 'Course 1', description: 'desc1', code: 'C1', cycle: 1 },
      { id: 2, title: 'Course 2', description: 'desc2', code: 'C2', cycle: 2 },
    ];
    // Mock for fetchCoursesById
    const mockCoursesById = [
      { id: 1, title: 'Course 1', code: 'C1', credits: 3 },
      { id: 2, title: 'Course 2', code: 'C2', credits: 4 },
    ];

    // First call: fetchAllCoursesWithoutCredits
    const mockResponse1: AxiosResponse<{ results: typeof mockCoursesWithoutCredits }> = {
      data: { results: mockCoursesWithoutCredits },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    };
    // Second call: fetchCoursesById
    const mockResponse2: AxiosResponse<typeof mockCoursesById> = {
      data: mockCoursesById,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    };
    const getMock = jest.spyOn(httpService, 'get');
    getMock.mockReturnValueOnce(of(mockResponse1));
    getMock.mockReturnValueOnce(of(mockResponse2));

    const result = await service.fetchAllCoursesWithCredits();
    expect(result).toEqual([
      { ...mockCoursesWithoutCredits[0], credits: 3 },
      { ...mockCoursesWithoutCredits[1], credits: 4 },
    ]);
  });

  it('should fetch courses by ids', async () => {
    const mockCourses = [
      { id: 1, title: 'Course 1', code: 'C1', credits: 3 },
      { id: 2, title: 'Course 2', code: 'C2', credits: 4 },
    ];

    const mockResponse: AxiosResponse<typeof mockCourses> = {
      data: mockCourses,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    };
    jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

    const result = await service.fetchCoursesById('1,2');
    expect(result).toEqual(mockCourses);
  });

  it('should throw if no courses fetched (by ids)', async () => {
    const mockResponse: AxiosResponse<any[]> = {
      data: [],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    };
    jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));
    await expect(service.fetchCoursesById('1,2')).rejects.toThrow('No courses fetched.');
  });
});
