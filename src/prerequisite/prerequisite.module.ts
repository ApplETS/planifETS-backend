import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PrerequisiteController } from './prerequisite.controller';
import { PrerequisiteService } from './prerequisite.service';

@Module({
  imports: [PrismaModule],
  controllers: [PrerequisiteController],
  providers: [PrerequisiteService],
})
export class PrerequisiteModule {}
