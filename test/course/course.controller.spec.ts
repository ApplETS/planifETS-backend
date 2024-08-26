import { Test, TestingModule } from '@nestjs/testing';

import { CourseController } from '../../src/course/course.controller';
import { CourseService } from '../../src/course/course.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('CourseController', () => {
  let controller: CourseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseController],
      providers: [PrismaService, CourseService],
    }).compile();

    controller = module.get<CourseController>(CourseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
