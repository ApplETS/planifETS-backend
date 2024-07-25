import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { of } from 'rxjs';

import { PlanificationCoursService } from '../../../../../../src/common/website-helper/pdf/pdf-parser/planification/planification-cours.service';

jest.mock('@nestjs/axios');
jest.mock(
  '../../../../../../src/common/pipes/models/course/course-code-validation-pipe',
);
jest.mock('../../../../../../src/common/utils/pdf/parser/pdfParserUtil');
jest.mock('../../../../../../src/common/utils/pdf/parser/textExtractorUtil');

describe('PlanificationCoursService', () => {
  let service: PlanificationCoursService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlanificationCoursService, HttpService],
    }).compile();

    service = module.get<PlanificationCoursService>(PlanificationCoursService);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('parsePdfFromUrl', () => {
    it('should fetch and parse the PDF', async () => {
      const pdfUrl =
        'https://horaire.etsmtl.ca/Horairepublication/Planification-7084.pdf';
      const pdfBuffer = Buffer.from('sample pdf data');
      const response: AxiosResponse<Buffer> = {
        data: pdfBuffer,
        status: 200,
        statusText: 'OK',
        headers: {} as never,
        config: { headers: {} as never },
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(response));
      jest.spyOn(service, 'parsePlanificationCoursPdf').mockResolvedValue([]);

      const result = await service.parsePdfFromUrl(pdfUrl);

      expect(httpService.get).toHaveBeenCalledWith(pdfUrl, {
        responseType: 'arraybuffer',
      });
      expect(service.parsePlanificationCoursPdf).toHaveBeenCalledWith(
        pdfBuffer,
        pdfUrl,
      );
      expect(result).toEqual([]);
    });
  });
});
