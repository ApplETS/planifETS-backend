import { Logger } from '@nestjs/common';

import { ProgramService } from '../program/program.service';
import { PrismaService } from './prisma.service';

const logger = new Logger('SeedPrograms');
import * as programData from '../../prisma/seeds/data/programs-to-seed.json';

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
