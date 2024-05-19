import { Injectable } from '@nestjs/common';

import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CourseService {
  public create(createCourseDto: CreateCourseDto) {
    return 'This action adds a new course';
  }

  public findAll() {
    return 'This action returns all course';
  }

  public findOne(id: number) {
    return 'This action returns a #${id} course';
  }

  public update(id: number, updateCourseDto: UpdateCourseDto) {
    return 'This action updates a #${id} course';
  }

  public remove(id: number) {
    return 'This action removes a #${id} course';
  }
}
