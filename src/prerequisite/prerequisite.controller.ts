import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { IdDto } from '../common/exceptions/dtos/id.dto';
import { PrerequisiteService } from './prerequisite.service';

@ApiTags('Prerequisites')
@Controller('prerequisites')
export class PrerequisiteController {
  constructor(private readonly prerequisiteService: PrerequisiteService) {}

  @Get(':courseId')
  public async getPrerequisites(@Param('courseId') { id }: IdDto) {
    return this.prerequisiteService.getPrerequisites({ courseId: id });
  }

  @Get()
  public async getAllPrerequisites() {
    return this.prerequisiteService.getAllCoursePrerequisites();
  }
}
