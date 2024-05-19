import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CourseInstanceService } from './course-instance.service';
import { CreateCourseInstanceDto } from './dto/create-course-instance.dto';
import { UpdateCourseInstanceDto } from './dto/update-course-instance.dto';

@Controller('course-instance')
export class CourseInstanceController {
  constructor(private readonly courseInstanceService: CourseInstanceService) {}

  @Post()
  public create(@Body() createCourseInstanceDto: CreateCourseInstanceDto) {
    return this.courseInstanceService.create(createCourseInstanceDto);
  }

  @Get()
  public findAll() {
    return this.courseInstanceService.findAll();
  }

  @Get(':id')
  public findOne(@Param('id') id: string) {
    return this.courseInstanceService.findOne(+id);
  }

  @Patch(':id')
  public update(
    @Param('id') id: string,
    @Body() updateCourseInstanceDto: UpdateCourseInstanceDto,
  ) {
    return this.courseInstanceService.update(+id, updateCourseInstanceDto);
  }

  @Delete(':id')
  public remove(@Param('id') id: string) {
    return this.courseInstanceService.remove(+id);
  }
}
