import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../src/prisma/prisma.service';
import { SessionService } from '../../src/session/session.service';
import { prisma } from '../test-utils/prisma';

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a session', async () => {
    const session = await service.getOrCreateSession(2025, 'AUTOMNE');
    expect(session).toMatchObject({ year: 2025, trimester: 'AUTOMNE' });
  });

  it('should get or create a session (idempotent)', async () => {
    const s1 = await service.getOrCreateSession(2025, 'ETE');
    const s2 = await service.getOrCreateSession(2025, 'ETE');
    expect(s1.year).toBe(s2.year);
    expect(s1.trimester).toBe(s2.trimester);
    expect(s1.year).toBe(2025);
    expect(s1.trimester).toBe('ETE');
  });

  it('should be idempotent with getOrCreateSession', async () => {
    const s1 = await service.getOrCreateSession(2051, 'HIVER');
    const s2 = await service.getOrCreateSession(2051, 'HIVER');
    expect(s1.trimester).toBe(s2.trimester);
    expect(s1.year).toBe(s2.year);
    expect(s2.year).toBe(2051);
    expect(s2.trimester).toBe('HIVER');
    const found = await service.getAllSessions();
    const count = found.filter(s => s.year === 2051 && s.trimester === 'HIVER').length;
    expect(count).toBe(1);
  });

  it('should only have one session for same year/trimester', async () => {
    await service.getOrCreateSession(2050, 'HIVER');
    const found = await service.getAllSessions();
    const count = found.filter(s => s.year === 2050 && s.trimester === 'HIVER').length;
    expect(count).toBe(1);
  });

  it('should only have one session for same year/trimester', async () => {
    await service.getOrCreateSession(2050, 'HIVER');
    const found = await service.getAllSessions();
    const count = found.filter(s => s.year === 2050 && s.trimester === 'HIVER').length;
    expect(count).toBe(1);
  });

  it('should parse valid session codes', async () => {
    const session = await service.getOrCreateSessionFromCode('E23');
    expect(session.year).toBe(2023);
    expect(session.trimester).toBe('ETE');
  });

  it('should throw for invalid year in session code via getOrCreateSessionFromCode', async () => {
    await expect(service.getOrCreateSessionFromCode('E')).rejects.toThrow();
  });

  it('should get or create current session', async () => {
    const now = new Date('2025-06-01'); // Should map to ETE
    const session = await service.getOrCreateCurrentSession(now);
    expect(session.year).toBe(2025);
    expect(session.trimester).toBe('ETE');
  });

  it('should throw if current trimester cannot be determined', async () => {
    await expect(service.getOrCreateCurrentSession(undefined)).rejects.toThrow();
  });

  it('should get or create session from code', async () => {
    const session = await service.getOrCreateSessionFromCode('A25');
    expect(session.year).toBe(2025);
    expect(session.trimester).toBe('AUTOMNE');
  });

  it('should throw for invalid session code', async () => {
    await expect(service.getOrCreateSessionFromCode('X99')).rejects.toThrow('Invalid session code: X99');
  });

  it('should get all sessions', async () => {
    await service.getOrCreateSession(2024, 'HIVER');
    await service.getOrCreateSession(2025, 'ETE');
    const sessions = await service.getAllSessions();
    expect(sessions.length).toBe(2);
    expect(sessions.map(s => s.year)).toEqual(expect.arrayContaining([2024, 2025]));
  });

  it('should throw for session code with non-numeric year part', async () => {
    await expect(service.getOrCreateSessionFromCode('EAA')).rejects.toThrow('Invalid session code: EAA');
    await expect(service.getOrCreateSessionFromCode('E1A')).rejects.toThrow('Invalid session code: E1A');
    await expect(service.getOrCreateSessionFromCode('E--')).rejects.toThrow('Invalid session code: E--');
  });

  it('should throw for session code with year part not two digits', async () => {
    await expect(service.getOrCreateSessionFromCode('E2')).rejects.toThrow('Invalid session code: E2');
    await expect(service.getOrCreateSessionFromCode('E123')).rejects.toThrow('Invalid session code: E123');
    await expect(service.getOrCreateSessionFromCode('E')).rejects.toThrow('Invalid session code: E');
  });

  it('should get latest available session', async () => {
    await service.getOrCreateSession(2023, 'HIVER');
    await service.getOrCreateSession(2025, 'ETE');
    const latest = await service.getLatestAvailableSession();
    expect(latest).toBeDefined();
    expect(latest?.year).toBe(2025);
    expect(latest?.trimester).toBe('ETE');
  });

  it('should return null if no sessions exist for latest', async () => {
    const latest = await service.getLatestAvailableSession();
    expect(latest).toBeNull();
  });
});
