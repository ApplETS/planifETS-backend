import { HttpService } from '@nestjs/axios';
import { readFileSync } from 'fs';
import { of } from 'rxjs';
import { PLANIFICATION_PDF_V2_PATH } from 'test/test-utils/constants';

import { PlanificationCoursService } from '@/common/website-helper/pdf/pdf-parser/planification/planification-cours.service';

it('returns session coverage from PDF headers even when all availability cells are empty', async () => {
  const http = {
    get: jest.fn(() => of({ data: readFileSync(PLANIFICATION_PDF_V2_PATH) }))
  };
  const parser = new PlanificationCoursService(http as unknown as HttpService);
  // Preserve real header parsing, while simulating a valid table with no offerings.
  jest
    .spyOn(parser, 'processPdfData')
    .mockReturnValue([{ code: 'GPE450', available: {} }]);
  const forecast = await parser.parseProgramForecast('7084');
  expect(forecast.sessionCodes).toEqual(['H26', 'E26', 'A26', 'H27', 'E27']);
  expect(forecast.courses).toEqual([{ code: 'GPE450', available: {} }]);
});
