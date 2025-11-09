import { Test, TestingModule } from '@nestjs/testing';

import { PrerequisiteService } from '../../src/prerequisite/prerequisite.service';
import { PrismaService } from '../../src/prisma/prisma.service';

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
      ],
    }).compile();

    service = module.get<PrerequisiteService>(PrerequisiteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
