import { Test, TestingModule } from '@nestjs/testing';

import { CourseInstanceService } from '../../src/course-instance/course-instance.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('CourseInstanceService', () => {
  let service: CourseInstanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseInstanceService, PrismaService],
    }).compile();

    service = module.get<CourseInstanceService>(CourseInstanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
