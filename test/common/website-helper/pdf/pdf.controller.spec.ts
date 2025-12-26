import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PdfController } from '@/common/website-helper/pdf/pdf.controller';
import { HoraireCoursService } from '@/common/website-helper/pdf/pdf-parser/horaire/horaire-cours.service';
import { HoraireCours } from '@/common/website-helper/pdf/pdf-parser/horaire/HoraireCours';
import { PlanificationCoursService } from '@/common/website-helper/pdf/pdf-parser/planification/planification-cours.service';
import { ICoursePlanification } from '@/common/website-helper/pdf/pdf-parser/planification/planification-cours.types';

describe('PdfController', () => {
  let controller: PdfController;
  let horaireCoursService: jest.Mocked<HoraireCoursService>;
  let planificationCoursService: jest.Mocked<PlanificationCoursService>;

  beforeEach(async () => {
    horaireCoursService = {
      parsePdfFromUrl: jest.fn(),
    } as unknown as jest.Mocked<HoraireCoursService>;
    planificationCoursService = {
      parsePdfFromUrl: jest.fn(),
    } as unknown as jest.Mocked<PlanificationCoursService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PdfController],
      providers: [
        { provide: HoraireCoursService, useValue: horaireCoursService },
        { provide: PlanificationCoursService, useValue: planificationCoursService },
      ],
    }).compile();

    controller = module.get<PdfController>(PdfController);
  });

  describe('parseHoraireCoursPdf', () => {
    it('should throw BAD_REQUEST if session or program is missing', async () => {
      await expect(controller.parseHoraireCoursPdf(undefined as unknown as string, '7084')).rejects.toThrow(HttpException);
      await expect(controller.parseHoraireCoursPdf('20261', undefined as unknown as string)).rejects.toThrow(HttpException);
    });

    it('should return parsed data on success', async () => {
      const mockResult = [
        new HoraireCours('CODE123', 'Sample Course', '', new Map())
      ];
      horaireCoursService.parsePdfFromUrl.mockResolvedValueOnce(mockResult);
      await expect(controller.parseHoraireCoursPdf('20261', '7084')).resolves.toEqual(mockResult);
    });

    it('should throw NOT_FOUND if axios error 404', async () => {
      const error = { isAxiosError: true, response: { status: 404 } };
      horaireCoursService.parsePdfFromUrl.mockRejectedValueOnce(error as unknown);
      await expect(controller.parseHoraireCoursPdf('20261', '7084')).rejects.toThrow(HttpException);
    });

    it('should throw INTERNAL_SERVER_ERROR for other errors', async () => {
      const error = new Error('fail');
      horaireCoursService.parsePdfFromUrl.mockRejectedValueOnce(error);
      await expect(controller.parseHoraireCoursPdf('20261', '7084')).rejects.toThrow(HttpException);
    });
  });

  describe('parsePlanificationCoursPdf', () => {
    it('should throw BAD_REQUEST if program is missing', async () => {
      await expect(controller.parsePlanificationCoursPdf(undefined as unknown as string)).rejects.toThrow(HttpException);
    });

    it('should return parsed data on success', async () => {
      const mockResult: ICoursePlanification[] = [{
        code: 'CODE456',
        available: { '20261': 'yes' },
      }];
      planificationCoursService.parsePdfFromUrl.mockResolvedValueOnce(mockResult);
      await expect(controller.parsePlanificationCoursPdf('7084')).resolves.toEqual(mockResult);
    });

    it('should throw NOT_FOUND if axios error 404', async () => {
      const error = { isAxiosError: true, response: { status: 404 } };
      planificationCoursService.parsePdfFromUrl.mockRejectedValueOnce(error as unknown);
      await expect(controller.parsePlanificationCoursPdf('7084')).rejects.toThrow(HttpException);
    });

    it('should throw INTERNAL_SERVER_ERROR for other errors', async () => {
      const error = new Error('fail');
      planificationCoursService.parsePdfFromUrl.mockRejectedValueOnce(error);
      await expect(controller.parsePlanificationCoursPdf('7084')).rejects.toThrow(HttpException);
    });
  });
});
