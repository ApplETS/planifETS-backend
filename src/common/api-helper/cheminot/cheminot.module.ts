import { Module } from '@nestjs/common';

import { CheminotController } from './cheminot.controller';
import { CheminotService } from './cheminot.service';
import { FileExtractionService } from './file-extraction.service';

@Module({
  controllers: [CheminotController],
  providers: [CheminotService, FileExtractionService],
  exports: [CheminotService],
})
export class CheminotModule {}
