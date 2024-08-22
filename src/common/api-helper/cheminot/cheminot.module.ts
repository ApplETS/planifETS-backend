import { Module } from '@nestjs/common';

import { CheminotController } from './cheminot.controller';
import { FileExtractionService } from './file-extraction.service';

@Module({
  controllers: [CheminotController],
  providers: [FileExtractionService],
})
export class CheminotModule {}
