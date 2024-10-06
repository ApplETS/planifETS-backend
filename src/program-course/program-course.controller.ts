import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ProgramCourseService } from './program-course.service';

@ApiTags('Programs courses')
@Controller('program-courses')
export class ProgramCourseController {
  constructor(private readonly programCourseService: ProgramCourseService) {}
}
