import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../src/prisma/prisma.service';
import { SessionService } from '../../src/session/session.service';


describe('SessionService', () => {
  let service: SessionService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, SessionService],
    }).compile();

    service = module.get<SessionService>(SessionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    // Clean up all sessions after each test
    await prisma.session.deleteMany();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a session', async () => {
    const session = await service.createSession({ year: 2025, trimester: 'AUTOMNE' });
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

  it('should not create duplicate sessions for same year/trimester', async () => {
    await service.createSession({ year: 2026, trimester: 'HIVER' });
    // Try to create again, should throw or fail due to unique constraint
    await expect(service.createSession({ year: 2026, trimester: 'HIVER' })).rejects.toThrow();
    const all = await service.getAllSessions();
    expect(all.filter(s => s.year === 2026 && s.trimester === 'HIVER').length).toBe(1);
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
    // getCurrentTrimester returns undefined for invalid date
    await expect(service.getOrCreateCurrentSession(new Date('invalid-date'))).rejects.toThrow();
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
    await service.createSession({ year: 2024, trimester: 'HIVER' });
    await service.createSession({ year: 2025, trimester: 'ETE' });
    const sessions = await service.getAllSessions();
    expect(sessions.length).toBe(2);
    expect(sessions.map(s => s.year)).toEqual(expect.arrayContaining([2024, 2025]));
  });

  it('should get latest available session', async () => {
    await service.createSession({ year: 2023, trimester: 'HIVER' });
    await service.createSession({ year: 2025, trimester: 'ETE' });
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
