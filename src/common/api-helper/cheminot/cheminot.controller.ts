import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { FileUtil } from '../../utils/pdf/fileUtil';
import { CheminotService } from './cheminot.service';
import { FileExtractionService } from './file-extraction.service';

@ApiTags('ÉTS API')
@Controller('cheminot')
export class CheminotController {
  constructor(
    private readonly fileExtractionService: FileExtractionService,
    private readonly cheminotService: CheminotService,
    private readonly fileUtil: FileUtil,
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

    //Write data to file as a json
    const fileName = 'parsed-programs-courses.json';

    // Write data to a JSON file using FileUtil
    await this.fileUtil.writeDataToFile(data, fileName);
    return data;
  }
}
