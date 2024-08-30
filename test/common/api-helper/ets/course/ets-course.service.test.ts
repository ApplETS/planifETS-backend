import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosHeaders, AxiosResponse } from 'axios';
import { of } from 'rxjs';

import { EtsCourseService } from '../../../../../src/common/api-helper/ets/course/ets-course.service';
import {
  ETS_API_GET_ALL_COURSES,
  ETS_API_GET_COURSES_BY_IDS,
} from '../../../../../src/common/constants/url';
import { extractNumberFromString } from '../../../../../src/common/utils/stringUtil';

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

  it('should fetch all courses without credits', async () => {
    const mockResponse: AxiosResponse = {
      data: {
        results: [
          {
            id: 1,
            title: 'Petit chaton',
            description: 'Description 1',
            code: 'Miaow321',
            cycle: null,
          },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        headers: new AxiosHeaders(),
      },
    };

    jest.spyOn(httpService, 'get').mockReturnValueOnce(of(mockResponse));

    const courses = await service.fetchAllCoursesWithoutCredits();

    expect(courses).toEqual([
      {
        id: 1,
        title: 'Petit chaton',
        description: 'Description 1',
        code: 'Miaow321',
        cycle: null,
      },
    ]);
  });

  it('should fetch courses by ids', async () => {
    const mockResponse: AxiosResponse = {
      data: [
        {
          id: 1,
          title: 'Prrrrrrrrrr',
          code: 'LOG100',
          credits: 4,
        },
      ],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        headers: new AxiosHeaders(),
      },
    };

    jest.spyOn(httpService, 'get').mockReturnValueOnce(of(mockResponse));

    const courses = await service.fetchCoursesById('1');

    expect(courses).toEqual([
      {
        id: 1,
        title: 'Prrrrrrrrrr',
        code: 'LOG100',
        credits: 4,
      },
    ]);
  });

  it('should fetch all courses with credits', async () => {
    const mockCoursesResponse: AxiosResponse = {
      data: {
        results: [
          {
            id: 1,
            title: 'League of Legends 123',
            description: 'Description 1',
            code: 'LOL123',
            cycle: '2e cycle',
          },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        headers: new AxiosHeaders(),
      },
    };

    const mockCoursesByIdResponse: AxiosResponse = {
      data: [
        {
          id: 1,
          title: 'League of Legends 123',
          code: 'LOL123',
          credits: 3,
        },
      ],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        headers: new AxiosHeaders(),
      },
    };

    jest.spyOn(httpService, 'get').mockImplementation((url) => {
      if (url.includes(ETS_API_GET_ALL_COURSES)) {
        return of(mockCoursesResponse);
      } else if (url.includes(ETS_API_GET_COURSES_BY_IDS)) {
        return of(mockCoursesByIdResponse);
      }

      // Return an empty observable as a fallback to avoid returning undefined
      return of({} as AxiosResponse);
    });

    const coursesWithCredits = await service.fetchAllCoursesWithCredits();

    expect(coursesWithCredits).toEqual([
      {
        id: 1,
        title: 'League of Legends 123',
        description: 'Description 1',
        code: 'LOL123',
        cycle: extractNumberFromString('2e cycle'),
        credits: 3,
      },
    ]);
  });
});
