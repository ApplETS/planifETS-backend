import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from './prisma.service';
import * as programData from './seeds/data/programs-to-seed.json';

const logger = new Logger('SeedPrograms');

export async function seedProgramHorairePdfParserFlags() {
  await seedParserFlags(programData.horairePdfPrograms, {
    isHorairePdfParsable: true
  });
}

export async function seedProgramPlanificationPdfParserFlags() {
  await seedParserFlags(programData.planificationPdfPrograms, {
    isPlanificationPdfParsable: true
  });
}

// Standalone seed script: writes via PrismaService directly so the prisma
// folder never depends on feature modules (program -> prisma only, no cycle).
async function seedParserFlags(
  codes: string[],
  data: Prisma.ProgramUpdateInput
) {
  const prismaService = new PrismaService();
  await prismaService.$connect();

  try {
    const { count } = await prismaService.program.updateMany({
      where: { code: { in: codes } },
      data
    });

    if (count === 0) {
      logger.error(`No programs found with codes: "${codes.join(', ')}"`);
      return;
    }

    logger.log(
      `Updated ${count} programs with codes "${codes.join(', ')}" to have ${Object.keys(data).join(', ')} = true.`
    );

    if (count < codes.length) {
      const existing = await prismaService.program.findMany({
        where: { code: { in: codes } },
        select: { code: true }
      });
      const existingCodes = new Set(existing.map((p) => p.code));
      const missing = codes.filter((code) => !existingCodes.has(code));
      logger.warn(
        `Some programs were not found in the database and were not updated: "${missing.join(', ')}"`
      );
    }
  } finally {
    await prismaService.$disconnect();
  }
}
