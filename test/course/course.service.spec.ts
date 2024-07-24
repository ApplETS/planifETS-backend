import { Test, TestingModule } from '@nestjs/testing';

import { CourseService } from '../../src/course/course.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('CourseService', () => {
  let service: CourseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, CourseService],
    }).compile();

    service = module.get<CourseService>(CourseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
