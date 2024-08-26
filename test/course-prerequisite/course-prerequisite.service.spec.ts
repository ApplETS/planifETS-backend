import { Test, TestingModule } from '@nestjs/testing';

import { CoursePrerequisiteService } from '../../src/course-prerequisite/course-prerequisite.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('CoursePrerequisiteService', () => {
  let service: CoursePrerequisiteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursePrerequisiteService,
        {
          provide: PrismaService,
          useValue: {
            coursePrerequisite: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CoursePrerequisiteService>(CoursePrerequisiteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
