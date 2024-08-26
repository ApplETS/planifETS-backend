import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../src/prisma/prisma.service';
import { ProgramController } from '../../src/program/program.controller';
import { ProgramService } from '../../src/program/program.service';

describe('ProgramController', () => {
  let controller: ProgramController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgramController],
      providers: [PrismaService, ProgramService],
    }).compile();

    controller = module.get<ProgramController>(ProgramController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
