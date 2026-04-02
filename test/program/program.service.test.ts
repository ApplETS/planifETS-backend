import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../src/prisma/prisma.service';
import { ProgramService } from '../../src/program/program.service';

describe('ProgramService', () => {
  let service: ProgramService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgramService,
        {
          provide: PrismaService,
          useValue: {
            program: {},
            programType: {},
          },
        },
      ],
    }).compile();

    service = module.get<ProgramService>(ProgramService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
