import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from './prisma.service';
import * as programData from './seeds/data/programs-to-seed.json';

const logger = new Logger('SeedPrograms');

// Synthetic umbrella programs absent from the ETS API (e.g. UQAM agreements
// have no program entry and no forecast PDF, only a schedule PDF).
export const UQAM_PROGRAM_CODE = 'UQAM';

const UMBRELLA_PROGRAMS: Prisma.ProgramCreateInput[] = [
  {
    id: -1,
    code: UQAM_PROGRAM_CODE,
    title: "Cours dans le cadre d'ententes avec l'UQAM",
    credits: null,
    cycle: 1,
    url: 'https://horaire.etsmtl.ca/',
    isHorairePdfParsable: true,
    isPlanificationPdfParsable: false
  },
  {
    id: -2,
    code: 'CyclesSuperieurs',
    title: 'Cycles supérieurs (maîtrise, doctorat, DESS)',
    credits: null,
    // Umbrella spans 2e and 3e cycles; courses carry their own cycle.
    cycle: 2,
    url: 'https://horaire.etsmtl.ca/',
    isHorairePdfParsable: true,
    isPlanificationPdfParsable: true
  }
];

export async function seedUmbrellaPrograms() {
  const prismaService = new PrismaService();
  await prismaService.$connect();

  try {
    for (const program of UMBRELLA_PROGRAMS) {
      await prismaService.program.upsert({
        where: { id: program.id },
        update: { ...program, updatedAt: new Date() },
        create: { ...program, createdAt: new Date(), updatedAt: new Date() }
      });
    }
  } finally {
    await prismaService.$disconnect();
  }
}

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
