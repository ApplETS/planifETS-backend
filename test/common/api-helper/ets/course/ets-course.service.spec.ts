import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { of } from 'rxjs';

import {
  EtsCourseService,
  IEtsCourse,
  IEtsCoursesData,
} from '../../../../../src/common/api-helper/ets/course/ets-course.service';

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
    const mockCourses: IEtsCoursesData[] = [
      { id: 1, title: 'Course 1', code: 'C1', cycle: 'Cycle 1' },
      { id: 2, title: 'Course 2', code: 'C2', cycle: 'Cycle 2' },
    ];

    const mockResponse: AxiosResponse<{ results: IEtsCoursesData[] }> = {
      data: { results: mockCourses },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        headers: {
          get: () => 'application/json',
          set: () => {},
          has: () => true,
          delete: () => true,
        },
      } as never,
    };
    jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

    const result = await service.fetchAllCourses();
    expect(result).toEqual(mockCourses);
  });

  it('should fetch courses by ids', async () => {
    const mockCourses: IEtsCourse[] = [
      { id: 1, title: 'Course 1', code: 'C1', cycle: 'Cycle 1', credits: '3' },
      { id: 2, title: 'Course 2', code: 'C2', cycle: 'Cycle 2', credits: '4' },
    ];

    const mockResponse: AxiosResponse<IEtsCourse[]> = {
      data: mockCourses,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        headers: {
          get: () => 'application/json',
          set: () => {},
          has: () => true,
          delete: () => true,
        },
      } as never,
    };
    jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

    const result = await service.fetchCoursesById('1,2');
    expect(result).toEqual(mockCourses);
  });
});
