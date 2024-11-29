import { Logger } from '@nestjs/common';

import { PrismaService } from '../../src/prisma/prisma.service';
import {
  seedProgramHorairePdfParserFlags,
  seedProgramPlanificationPdfParserFlags,
} from '../../src/prisma/programs.seeder';

const prismaService = new PrismaService();

async function main() {
  await seedProgramHorairePdfParserFlags();
  await seedProgramPlanificationPdfParserFlags();
}

main()
  .catch((e) => {
    Logger.error(`Seeding error: ${e}`);
    process.exit(1);
  })
  .finally(async () => {
    await prismaService.$disconnect();
  });
