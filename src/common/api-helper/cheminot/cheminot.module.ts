import { Module } from '@nestjs/common';

import { FileUtil } from '../../utils/pdf/fileUtil';
import { CheminotController } from './cheminot.controller';
import { CheminotService } from './cheminot.service';
import { FileExtractionService } from './file-extraction.service';

@Module({
  controllers: [CheminotController],
  //TODO REmove FileUtil from providers and exports
  providers: [CheminotService, FileExtractionService, FileUtil],
  exports: [FileUtil],
})
export class CheminotModule {}
