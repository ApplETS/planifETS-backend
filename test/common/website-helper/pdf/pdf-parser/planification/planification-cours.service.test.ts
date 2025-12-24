import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosHeaders, AxiosResponse } from 'axios';
import * as fs from 'fs';
import { of, throwError } from 'rxjs';

import { PlanificationCoursService } from '@/common/website-helper/pdf/pdf-parser/planification/planification-cours.service';
import { ICoursePlanification } from '@/common/website-helper/pdf/pdf-parser/planification/planification-cours.types';
import { PdfParserUtil } from '@/utils/pdf/parser/pdfParserUtil';

// Extract only code and available fields from a course
function mapCoursePlanification(c: ICoursePlanification) {
  return { code: c.code, available: c.available };
}

// Sort by course code
function sortByCode(a: { code: string }, b: { code: string }) {
  return a.code.localeCompare(b.code);
}

function normalizeCourseArray(arr: Array<ICoursePlanification>) {
  return arr
    .map(mapCoursePlanification)
    .sort(sortByCode);
}

describe('PlanificationCoursService', () => {
  let service: PlanificationCoursService;
  let httpService: HttpService;
  let pdf_v1: Buffer;
  let pdf_v2: Buffer;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanificationCoursService,
        {
          provide: HttpService,
          useValue: { get: jest.fn() },

        },
      ],
    }).compile();

    service = module.get<PlanificationCoursService>(PlanificationCoursService);
    httpService = module.get<HttpService>(HttpService);

    pdf_v1 = fs.readFileSync('test/assets/pdf/Planification-7084-v1.pdf');
    pdf_v2 = fs.readFileSync('test/assets/pdf/Planification-7084-v2.pdf');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('parsePlanificationCoursPdf should call PdfParserUtil.parsePdfBuffer', async () => {
    const spy = jest.spyOn(PdfParserUtil, 'parsePdfBuffer').mockResolvedValueOnce([] as Array<ICoursePlanification>);
    await service.parsePlanificationCoursPdf(Buffer.from([]), 'dummy.pdf');
    expect(spy).toHaveBeenCalled();
  });

  describe('Error handling', () => {
    it('parsePdfFromUrl should throw a descriptive error when httpService.get errors', async () => {
      jest.spyOn(httpService, 'get').mockReturnValueOnce(throwError(() => new Error('Network error')));
      await expect(service.parsePdfFromUrl('https://dummy')).rejects.toThrow('Error fetching pdf from URL');
    });

    it('parseProgramPlanification should propagate parse errors with context', async () => {
      jest.spyOn(service, 'parsePdfFromUrl').mockRejectedValueOnce(new Error('parse error'));
      await expect(service.parseProgramPlanification('7084')).rejects.toThrow(/Error parsing Planification-PDF/);
    });

    it('parsePdfFromUrl should throw the original error if status is 404 (not found)', async () => {
      const axiosError = {
        response: { status: 404 },
        message: 'Request failed with status code 404',
        isAxiosError: true,
      };
      jest.spyOn(httpService, 'get').mockReturnValueOnce(throwError(() => axiosError));
      await expect(service.parsePdfFromUrl('https://dummy-not-found')).rejects.toMatchObject({
        response: { status: 404 },
      });
    });
  });

  describe('Integration checks for v1 and v2', () => {
    let result_v1: Array<ICoursePlanification>;
    let result_v2: Array<ICoursePlanification>;
    const loadFromBuffer = async (buffer: Buffer) => {
      const httpResponse: AxiosResponse<Buffer> = {
        data: buffer,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      jest.spyOn(httpService, 'get').mockReturnValueOnce(of(httpResponse));
      return service.parsePdfFromUrl('https://dummy.horaire.etsmt.ca/Horairepublication/Planification-7084.pdf');
    };

    beforeAll(async () => {
      result_v1 = await loadFromBuffer(pdf_v1);
      result_v2 = await loadFromBuffer(pdf_v2);
    });

    it('both versions should return defined, non-empty arrays', () => {
      expect(result_v1).toBeDefined();
      expect(result_v1.length).toBeGreaterThan(0);
      expect(result_v2).toBeDefined();
      expect(result_v2.length).toBeGreaterThan(0);
    });

    it('v2 parsed output should match expected JSON data exactly (sorted by code)', () => {
      const expectedV2 = JSON.parse(fs.readFileSync('test/assets/data/Planification-7084-v2.json', 'utf-8')) as Array<ICoursePlanification>;

      expect(normalizeCourseArray(result_v2)).toEqual(normalizeCourseArray(expectedV2));
    });

    it('a course that changes between v1 and v2 should reflect different availability', () => {
      const a_v1 = result_v1.find((c) => c.code === 'ATE100')!;
      const a_v2 = result_v2.find((c) => c.code === 'ATE100')!;
      expect(a_v1).toBeDefined();
      expect(a_v2).toBeDefined();
      // Ensure availability objects are not identical between versions for this code
      expect(JSON.stringify(a_v1.available)).not.toEqual(JSON.stringify(a_v2.available));
    });

    it('courses with single-letter availability (J/S/I) are parsed as expected in each version', () => {
      const tin_v1 = result_v1.find((c) => c.code === 'TIN504')!;
      const tin_v2 = result_v2.find((c) => c.code === 'TIN504')!;
      expect(tin_v1).toBeDefined();
      expect(tin_v1.available).toBeDefined();
      expect(tin_v2).toBeDefined();
      expect(tin_v2.available).toBeDefined();
      // Ensure at least one session is parsed as 'S' or 'J' in each version
      const hasSOrJ_v1 = (Object.values(tin_v1.available)).some((v) => /[JS]/.test(v));
      const hasSOrJ_v2 = (Object.values(tin_v2.available)).some((v) => /[JS]/.test(v));
      expect(hasSOrJ_v1).toBe(true);
      expect(hasSOrJ_v2).toBe(true);
    });

    it('non-JSI combinations should be ignored (example check from v1)', () => {
      const course = result_v1.find((c) => c.code === 'ATE070');
      expect(course).toBeDefined();
      expect(course!.available).toEqual({});
    });
  });
});
