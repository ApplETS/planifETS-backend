import { Test, TestingModule } from '@nestjs/testing';

import { CourseInstanceController } from '../../src/course-instance/course-instance.controller';
import { CourseInstanceService } from '../../src/course-instance/course-instance.service';

describe('CourseInstanceController', () => {
  let controller: CourseInstanceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseInstanceController],
      providers: [CourseInstanceService],
    }).compile();

    controller = module.get<CourseInstanceController>(CourseInstanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
