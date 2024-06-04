import { Module } from '@nestjs/common';

import { ProgramController } from './program.controller';
import { ProgramService } from './program.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProgramController],
  providers: [ProgramService],
})
export class ProgramModule {}
