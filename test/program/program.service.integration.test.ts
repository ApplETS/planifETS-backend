import { HttpModule } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';

import { EtsProgramService } from '@/common/api-helper/ets/program/ets-program.service';

import { ProgramsJobService } from '../../src/jobs/workers/programs.worker';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ProgramService } from '../../src/program/program.service';

describe('ProgramService (integration)', () => {
  let programService: ProgramService;
  let seedModule: TestingModule;

  beforeAll(async () => {
    seedModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        ProgramsJobService,
        ProgramService,
        EtsProgramService,
        {
          provide: PrismaService,
          useValue: jestPrisma.originalClient,
        },
      ],
    }).compile();
    const programsJobService = seedModule.get(ProgramsJobService);
    programService = seedModule.get(ProgramService);

    // Seed baseline data once with the non-transaction client.
    await programsJobService.processPrograms();
  });

  afterAll(async () => {
    if (seedModule) {
      await seedModule.close();
    }
  });

  it('should have seeded x minimum programs', async () => {
    const programs = await programService.getAllPrograms();
    expect(programs).not.toBe(0);
    expect(programs.length).not.toBeUndefined();
    expect(programs.length).not.toBeNull();
    expect(programs.length).toBeGreaterThan(80);
  });

  it('should get all active programs', async () => {
    const programs = await programService.getAllActivePrograms();
    expect(programs.length).toBe(0);
  });

  it('should get program by code', async () => {
    const program = await programService.getProgramByCode('7084');
    expect(program).toBeDefined();
    expect(program?.title).toBe('Baccalauréat en génie logiciel');
  });

  it('should get programs by isHorairePdfParsable', async () => {
    // ensure all programs flags are false
    const allPrograms = (await programService.getAllPrograms()).filter(
      (prg): prg is typeof prg & { code: string } => typeof prg.code === 'string',
    );
    const [targetProgram] = allPrograms;

    expect(targetProgram).toBeDefined();

    for (const prog of allPrograms) {
      await programService.updateProgramsByCodes([prog.code], {
        isHorairePdfParsable: false,
      });
    }
    // set specific program flag to true
    await programService.updateProgramsByCodes([targetProgram.code], {
      isHorairePdfParsable: true,
    });

    const programs = await programService.getProgramsByHoraireParsablePDF();
    expect(programs.some(p => p.code === targetProgram.code)).toBe(true);
    expect(programs.some(p => p.code === 'miaow cacawette fouette')).toBe(false);
  });

  it('should get programs by isPlanificationPdfParsable', async () => {
    // ensure all programs flags are false
    const allPrograms = (await programService.getAllPrograms()).filter(
      (prg): prg is typeof prg & { code: string } => typeof prg.code === 'string',
    );
    const [targetProgram] = allPrograms;

    expect(targetProgram).toBeDefined();

    for (const prog of allPrograms) {
      await programService.updateProgramsByCodes([prog.code], {
        isPlanificationPdfParsable: false,
      });
    }
    // set specific program flag to true
    await programService.updateProgramsByCodes([targetProgram.code], {
      isPlanificationPdfParsable: true,
    });

    const programs = await programService.getProgramsByPlanificationParsablePDF();
    // does it exist?
    expect(programs).toBeDefined();
    expect(programs.length).toBeGreaterThan(0);
    expect(programs.some(p => p.code === targetProgram.code)).toBe(true);
    expect(programs.some(p => p.code === 'miaow cacawette fouette')).toBe(false);
  });

  it('should upsert a program', async () => {
    const upserted = await programService.upsertProgram({
      id: 9999,
      code: 'UPSERT1',
      title: 'Upserted Program',
      credits: '60',
      cycle: 3,
      url: 'http://example.com/upsert',
      programTypes: { connect: [] },
      isHorairePdfParsable: false,
      isPlanificationPdfParsable: false,
    });
    expect(upserted.code).toBe('UPSERT1');
    const found = await programService.getProgramByCode('UPSERT1');
    expect(found).toBeDefined();
  });

  it('should update credits and flags on upsert', async () => {
    const initial = await programService.upsertProgram({
      id: 9999,
      code: 'UPSERT1',
      title: 'Upserted Program',
      credits: '60',
      cycle: 3,
      url: 'http://example.com/upsert',
      programTypes: { connect: [] },
      isHorairePdfParsable: true,
      isPlanificationPdfParsable: false,
    });

    expect(initial.credits).toBe('60');
    const upserted = await programService.upsertProgram({
      id: 9999,
      code: 'UPSERT1',
      title: 'Upserted Program',
      credits: '90',
      cycle: 3,
      url: 'http://example.com/upsert',
      programTypes: { connect: [] },
      isHorairePdfParsable: false,
      isPlanificationPdfParsable: true,
    });

    expect(upserted.credits).toBe('90');
    expect(upserted.isHorairePdfParsable).toBe(false);
    expect(upserted.isPlanificationPdfParsable).toBe(true);
  });

  it('should upsert and update a program', async () => {
    const code = 'UPSERT2';
    await programService.upsertProgram({
      id: 10001,
      code,
      title: 'Initial Title',
      credits: '30',
      cycle: 1,
      url: 'http://example.com/upsert2',
      programTypes: { connect: [] },
      isHorairePdfParsable: false,
      isPlanificationPdfParsable: false,
    });
    let found = await programService.getProgramByCode(code);
    expect(found).toBeDefined();
    expect(found?.title).toBe('Initial Title');
    // Update
    await programService.upsertProgram({
      id: 10001,
      code,
      title: 'Updated Title',
      credits: '60',
      cycle: 2,
      url: 'http://example.com/upsert2',
      programTypes: { connect: [] },
      isHorairePdfParsable: true,
      isPlanificationPdfParsable: true,
    });
    found = await programService.getProgramByCode(code);
    expect(found).toBeDefined();
    expect(found?.title).toBe('Updated Title');
    expect(found?.credits).toBe('60');
    expect(found?.isHorairePdfParsable).toBe(true);
    expect(found?.isPlanificationPdfParsable).toBe(true);
  });
});
