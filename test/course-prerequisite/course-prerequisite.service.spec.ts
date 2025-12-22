import { Test, TestingModule } from '@nestjs/testing';

import { PrerequisiteService } from '../../src/prerequisite/prerequisite.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ProgramCourseService } from '../../src/program-course/program-course.service';
import { CourseService } from '../../src/course/course.service';

describe('CoursePrerequisiteService', () => {
  let service: PrerequisiteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrerequisiteService,
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
        {
          provide: ProgramCourseService,
          useValue: {},
        },
        {
          provide: CourseService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<PrerequisiteService>(PrerequisiteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
