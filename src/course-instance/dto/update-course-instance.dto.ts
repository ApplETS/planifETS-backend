import { PartialType } from '@nestjs/mapped-types';

import { CreateCourseInstanceDto } from './create-course-instance.dto';

export class UpdateCourseInstanceDto extends PartialType(
  CreateCourseInstanceDto,
) {}
