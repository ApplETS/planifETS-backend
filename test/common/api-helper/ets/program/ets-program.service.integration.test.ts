import { HttpModule } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';

import { ProgramTypeEtsApiDto } from '@/common/api-helper/ets/program/dtos/program-type-ets-api.dto';
import { EtsProgramService, Program } from '@/common/api-helper/ets/program/ets-program.service';

describe('EtsProgramService (live integration)', () => {
  let service: EtsProgramService;
  let types: ProgramTypeEtsApiDto[];
  let programs: Program[];
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [EtsProgramService],
    }).compile();
    service = moduleRef.get(EtsProgramService);
    const result = await service.fetchAllProgramsFromEtsAPI();
    types = result.types;
    programs = result.programs;
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('should fetch types as array of correct DTOs', () => {
    expect(Array.isArray(types)).toBe(true);
    types.forEach((type: ProgramTypeEtsApiDto) => {
      expect(typeof type.id).toBe('number');
      expect(typeof type.title).toBe('string');
    });
  });

  it('should fetch programs as array', () => {
    expect(Array.isArray(programs)).toBe(true);
    expect(programs.length).toBeGreaterThan(0);
  });

  it('should have valid id, title, and cycle for each program', () => {
    programs.forEach((program: Program) => {
      expect(typeof program.id).toBe('number');
      expect(typeof program.title).toBe('string');
      expect(typeof program.cycle).toBe('number');
    });
  });

  it('should have code as string, null, or object', () => {
    programs.forEach((program: Program) => {
      expect(
        typeof program.code === 'string' ||
        program.code === null ||
        typeof program.code === 'object'
      ).toBe(true);
    });
  });

  it('should have credits as string or null', () => {
    programs.forEach((program: Program) => {
      if (typeof program.credits === 'object' && program.credits !== null) {
        console.log('Program with object credits:', program);
      }
      expect(
        typeof program.credits === 'string' ||
        program.credits === null
      ).toBe(true);
    });
  });

  it('should have programTypes.connect as array of objects with id:number', () => {
    programs.forEach((program: Program) => {
      expect(Array.isArray(program.programTypes.connect)).toBe(true);
      program.programTypes.connect.forEach((typeObj) => {
        expect(typeof typeObj).toBe('object');
        expect(typeObj).not.toBeNull();
        expect(typeof typeObj.id).toBe('number');
      });
    });
  });
  it('should have valid ProgramTypeEtsApiDto objects in types', () => {
    types.forEach((type: ProgramTypeEtsApiDto) => {
      expect(typeof type.id).toBe('number');
      expect(typeof type.title).toBe('string');
    });
  });

  it('should have url as string', () => {
    programs.forEach((program: Program) => {
      expect(typeof program.url).toBe('string');
    });
  });
});
