import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosHeaders, AxiosResponse } from 'axios';
import * as fs from 'fs';
import { of } from 'rxjs';

import { PlanificationCoursService } from '@/common/website-helper/pdf/pdf-parser/planification/planification-cours.service';
import { ICoursePlanification } from '@/common/website-helper/pdf/pdf-parser/planification/planification-cours.types';

describe('PlanificationCoursService', () => {
  let service: PlanificationCoursService;
  let httpService: HttpService;
  let pdfBuffer: Buffer;
  let result_v1: ICoursePlanification[];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanificationCoursService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PlanificationCoursService>(PlanificationCoursService);
    httpService = module.get<HttpService>(HttpService);

    // Read the PDF file once and store the buffer
    pdfBuffer = fs.readFileSync('test/assets/pdf/Planification-7084-v1.pdf');

    // Mock the HTTP service to return the local PDF buffer as if it was fetched from a URL
    const httpResponse: AxiosResponse<Buffer> = {
      data: pdfBuffer,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        headers: new AxiosHeaders(),
      },
    };

    jest.spyOn(httpService, 'get').mockReturnValueOnce(of(httpResponse));

    // Parse the PDF once and store the result
    result_v1 = await service.parsePdfFromUrl(
      'https://dummy.horaire.etsmt.ca/Horairepublication/Planification-7084.pdf',
    );
  });

  it('should return a defined result', () => {
    expect(result_v1).toBeDefined();
  });

  it('should return a non-empty array', () => {
    expect(result_v1.length).toBeGreaterThan(0);
  });

  it('should handle courses with no availability correctly', () => {
    const course = result_v1.find((c) => c.code === 'ATE050')!;

    expect(course).toBeDefined();
    expect(course.available).toEqual({});
  });

  it('should correctly parse the availability for a course with "J" availability', () => {
    const course = result_v1.find((c) => c.code === 'ENT601')!;

    expect(course).toBeDefined();
    expect(course.available).toEqual({
      A24: 'J',
      A25: 'J',
    });
  });

  it('should correctly parse the availability for a course with "S" availability', () => {
    const course = result_v1.find((c) => c.code === 'TIN504')!;

    expect(course).toBeDefined();
    expect(course.available).toEqual({
      H25: 'S',
    });
  });

  it('should correctly parse the availability for a course with "I" availability', () => {
    const course = result_v1.find((c) => c.code === 'ATE100')!;
    expect(course).toBeDefined();
    expect(course.available).toEqual({
      E24: 'I',
      A24: 'I',
      H25: 'I',
      E25: 'I',
      A25: 'I',
    });
  });

  it('should correctly parse the availability for a course with "JS" availability', () => {
    const course = result_v1.find((c) => c.code === 'MAT350')!;

    expect(course).toBeDefined();
    expect(course.available).toEqual({
      E24: 'JS',
      A24: 'JS',
      H25: 'JS',
      E25: 'JS',
      A25: 'JS',
    });
  });

  it('should ignore non-JSI combinations in availability sessions', async () => {
    const course = result_v1.find((c) => c.code === 'ATE070');

    expect(course).toBeDefined();
    expect(course!.available).toEqual({});
  });

  it('should parse the correct number of courses', () => {
    expect(result_v1.length).toBe(88);
  });
});
