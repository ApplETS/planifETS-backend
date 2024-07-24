import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';

@Module({
  imports: [PrismaModule],
  controllers: [SessionController],
  providers: [SessionService],
})
export class SessionModule {}
