import { Injectable } from '@nestjs/common';

import { CreateCourseInstanceDto } from './dto/create-course-instance.dto';
import { UpdateCourseInstanceDto } from './dto/update-course-instance.dto';

@Injectable()
export class CourseInstanceService {
  public create(createCourseInstanceDto: CreateCourseInstanceDto) {
    return 'This action adds a new courseInstance';
  }

  public findAll() {
    return 'This action returns all courseInstance';
  }

  public findOne(id: number) {
    return 'This action returns a #${id} courseInstance';
  }

  public update(id: number, updateCourseInstanceDto: UpdateCourseInstanceDto) {
    return 'This action updates a #${id} courseInstance';
  }

  public remove(id: number) {
    return 'This action removes a #${id} courseInstance';
  }
}
