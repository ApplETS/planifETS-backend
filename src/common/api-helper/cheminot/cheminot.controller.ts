import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CheminotService } from './cheminot.service';
import { FileExtractionService } from './file-extraction.service';

@ApiTags('ÉTS API')
@Controller('cheminot')
export class CheminotController {
  constructor(
    private readonly fileExtractionService: FileExtractionService,
    private readonly cheminotService: CheminotService,
  ) {}

  @Get('cheminements-file')
  @ApiOperation({ summary: 'Get the extracted the cheminements.txt file' })
  public async getCheminementsFile(): Promise<string> {
    return this.fileExtractionService.extractCheminementsFile();
  }

  @Get('programs-courses')
  @ApiOperation({
    summary: 'Parse the programs and courses from the cheminements.txt file',
  })
  public async parseProgramsAndCoursesFromCheminotTxtFile() {
    await this.cheminotService.loadPrograms();
    const data = this.cheminotService.getPrograms();

    return data;
  }
}
