import { Logger } from '@nestjs/common';

import { PrismaService } from '../../src/prisma/prisma.service';
import { ProgramService } from '../../src/program/program.service';

const logger = new Logger('SeedPrograms');
import * as programData from './data/programs-to-seed.json';

export async function seedProgramPdfParserFlags() {
  const horairePdfPrograms = programData.horairePdfPrograms;

  const prismaService = new PrismaService();
  const programService = new ProgramService(prismaService);

  await prismaService.$connect();

  const updatedCountHorairePdf = await programService.updateProgramsByCodes(
    horairePdfPrograms,
    {
      isHorairePdfParsable: true,
    },
  );

  if (updatedCountHorairePdf > 0) {
    logger.log(
      `Updated ${updatedCountHorairePdf} programs with codes "${horairePdfPrograms.join(', ')}" to have pdfParsable = true.`,
    );
  }

  await prismaService.$disconnect();
}
