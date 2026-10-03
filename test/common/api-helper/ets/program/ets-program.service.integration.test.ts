import { createEtsApiTestModule, expectDto } from 'test/test-utils/ets-api';

import { ProgramIndexResponseDto } from '@/common/api-helper/ets/program/dtos/program-index-response.dto';
import {
  EtsProgramService,
  Program
} from '@/common/api-helper/ets/program/ets-program.service';
import {
  extractNumberFromString,
  stripHtmlTags
} from '@/common/utils/stringUtil';
import {
  ETS_API_GET_ALL_PROGRAMS,
  ETS_USER_AGENT
} from '@/common/utils/url/url-constants';

describe('EtsProgramService (live ETS contract)', () => {
  let context: Awaited<ReturnType<typeof createEtsApiTestModule>>;
  let raw: ProgramIndexResponseDto;
  let programs: Program[];
  let types: ProgramIndexResponseDto['types'];

  beforeAll(async () => {
    context = await createEtsApiTestModule();
    // Observe and validate the real response without replacing the transport.
    context.client.interceptors.response.use((response) => {
      expect(response.status).toBe(200);
      expect(response.config.url).toBe(ETS_API_GET_ALL_PROGRAMS);
      expect(response.config.headers.get('User-Agent')).toBe(ETS_USER_AGENT);
      raw = expectDto(ProgramIndexResponseDto, response.data);
      return response;
    });
    ({ programs, types } = await context.moduleRef
      .get(EtsProgramService)
      .fetchAllProgramsFromEtsAPI());
  }, 60000);

  afterAll(async () => {
    await context?.moduleRef.close();
  });

  it('matches the raw program and program-type DTOs for every entry', () => {
    const payload = expectDto(ProgramIndexResponseDto, raw);
    expect(payload.results.length).toBeGreaterThan(0);
    expect(payload.types.length).toBeGreaterThan(0);
    const typeIds = payload.types.map((type) => type.id);
    expect(new Set(typeIds).size).toBe(typeIds.length);
    expect(new Set(payload.results.map((program) => program.id)).size).toBe(
      payload.results.length
    );
    payload.results.forEach((program) => {
      expect(program.types.length).toBeGreaterThan(0);
      program.types.forEach((id) => expect(typeIds).toContain(id));
    });
  });

  it('fetches a non-empty array of program types with valid IDs and titles', () => {
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThan(0);
    expect(types).toEqual(raw.types);
    types.forEach((type) => {
      expect(typeof type.id).toBe('number');
      expect(typeof type.title).toBe('string');
    });
  });

  it('fetches a non-empty array of programs', () => {
    expect(Array.isArray(programs)).toBe(true);
    expect(programs.length).toBe(raw.results.length);
    expect(programs.length).toBeGreaterThan(0);
  });

  it('maps each program ID, title and cycle', () => {
    programs.forEach((program, index) => {
      expect(program.id).toBe(raw.results[index].id);
      expect(program.title).toBe(stripHtmlTags(raw.results[index].title));
      expect(program.cycle).toBe(
        extractNumberFromString(raw.results[index].cycle)
      );
      expect(typeof program.id).toBe('number');
      expect(typeof program.title).toBe('string');
      expect(typeof program.cycle).toBe('number');
    });
  });

  it('maps codes to the first code string or null', () => {
    programs.forEach((program, index) => {
      const code = raw.results[index].code;
      expect(program.code).toBe(code ? code.split(',')[0].trim() : null);
      expect(program.code === null || typeof program.code === 'string').toBe(
        true
      );
    });
  });

  it('preserves credits as a string or null', () => {
    programs.forEach((program, index) => {
      expect(program.credits).toBe(raw.results[index].credits);
      expect(
        program.credits === null || typeof program.credits === 'string'
      ).toBe(true);
    });
  });

  it('maps programTypes.connect to objects with numeric IDs', () => {
    programs.forEach((program, index) => {
      expect(program.programTypes.connect).toEqual(
        raw.results[index].types.map((id) => ({ id }))
      );
      program.programTypes.connect.forEach((type) => {
        expect(typeof type.id).toBe('number');
      });
    });
  });

  it('preserves each program URL', () => {
    programs.forEach((program, index) => {
      expect(typeof program.url).toBe('string');
      expect(program.url).toBe(raw.results[index].url);
    });
  });
});
