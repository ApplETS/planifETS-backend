import { Logger } from '@nestjs/common';

import { ProgramService } from '../program/program.service';
import { PrismaService } from './prisma.service';

const logger = new Logger('SeedPrograms');
import * as programData from './seeds/data/programs-to-seed.json';

export async function seedProgramHorairePdfParserFlags() {
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
      `Updated ${updatedCountHorairePdf} programs with codes "${horairePdfPrograms.join(', ')}" to have isHorairePdfParsable = true.`,
    );
  }

  await prismaService.$disconnect();
}

export async function seedProgramPlanificationPdfParserFlags() {
  const planificationPdfPrograms = programData.planificationPdfPrograms;

  const prismaService = new PrismaService();
  const programService = new ProgramService(prismaService);

  await prismaService.$connect();

  const updatedCountPlanificationPdf =
    await programService.updateProgramsByCodes(planificationPdfPrograms, {
      isPlanificationPdfParsable: true,
    });

  if (updatedCountPlanificationPdf > 0) {
    logger.log(
      `Updated ${updatedCountPlanificationPdf} programs with codes "${planificationPdfPrograms.join(', ')}" to have isPlanificationPdfParsable = true.`,
    );
  }

  await prismaService.$disconnect();
}
