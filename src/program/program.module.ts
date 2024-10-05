import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ProgramController } from './program.controller';
import { ProgramService } from './program.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProgramController],
  providers: [ProgramService],
  exports: [ProgramService],
})
export class ProgramModule {}
