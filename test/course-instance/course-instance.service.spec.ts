import { Test, TestingModule } from '@nestjs/testing';

import { CourseInstanceService } from '../../src/course-instance/course-instance.service';

describe('CourseInstanceService', () => {
  let service: CourseInstanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseInstanceService],
    }).compile();

    service = module.get<CourseInstanceService>(CourseInstanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
