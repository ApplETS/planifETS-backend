import { Test, TestingModule } from '@nestjs/testing';

jest.mock('../../src/common/utils/session/sessionUtil', () => ({
  ...jest.requireActual('../../src/common/utils/session/sessionUtil'),
  getCurrentTrimester: jest.fn(),
}));
import * as sessionUtil from '../../src/common/utils/session/sessionUtil';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SessionService } from '../../src/session/session.service';

describe('SessionService', () => {
  let sessionService: SessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionService, PrismaService],
    }).compile();
    sessionService = module.get<SessionService>(SessionService);
  });

  it('should be defined', () => {
    expect(sessionService).toBeDefined();
  });

  it('should create a session', async () => {
    const session = await sessionService.getOrCreateSession(2025, 'AUTOMNE');
    expect(session).toMatchObject({ year: 2025, trimester: 'AUTOMNE' });
  });

  it('should get or create a session (idempotent)', async () => {
    const s1 = await sessionService.getOrCreateSession(2025, 'ETE');
    const s2 = await sessionService.getOrCreateSession(2025, 'ETE');
    expect(s1.year).toBe(s2.year);
    expect(s1.trimester).toBe(s2.trimester);
    expect(s1.year).toBe(2025);
    expect(s1.trimester).toBe('ETE');
  });

  it('should be idempotent with getOrCreateSession', async () => {
    const s1 = await sessionService.getOrCreateSession(2051, 'HIVER');
    const s2 = await sessionService.getOrCreateSession(2051, 'HIVER');
    expect(s1.trimester).toBe(s2.trimester);
    expect(s1.year).toBe(s2.year);
    expect(s2.year).toBe(2051);
    expect(s2.trimester).toBe('HIVER');
    const found = await sessionService.getAllSessions();
    const count = found.filter(s => s.year === 2051 && s.trimester === 'HIVER').length;
    expect(count).toBe(1);
  });

  it('should only have one session for same year/trimester', async () => {
    await sessionService.getOrCreateSession(2050, 'HIVER');
    const found = await sessionService.getAllSessions();
    const count = found.filter(s => s.year === 2050 && s.trimester === 'HIVER').length;
    expect(count).toBe(1);
  });

  it('should only have one session for same year/trimester', async () => {
    await sessionService.getOrCreateSession(2050, 'HIVER');
    const found = await sessionService.getAllSessions();
    const count = found.filter(s => s.year === 2050 && s.trimester === 'HIVER').length;
    expect(count).toBe(1);
  });

  it('should parse valid session codes', async () => {
    const session = await sessionService.getOrCreateSessionFromCode('E23');
    expect(session.year).toBe(2023);
    expect(session.trimester).toBe('ETE');
  });

  it('should throw for invalid year in session code via getOrCreateSessionFromCode', async () => {
    await expect(sessionService.getOrCreateSessionFromCode('E')).rejects.toThrow();
    await expect(sessionService.getOrCreateSessionFromCode('25')).rejects.toThrow();
    await expect(sessionService.getOrCreateSessionFromCode('/sd')).rejects.toThrow();
    await expect(sessionService.getOrCreateSessionFromCode('sd/')).rejects.toThrow();
  });

  it('should get or create current session', async () => {
    (sessionUtil.getCurrentTrimester as jest.Mock).mockReturnValue('ETE');
    const now = new Date('2025-06-01'); // Should map to ETE
    const session = await sessionService.getOrCreateCurrentSession(now);
    expect(session.year).toBe(2025);
    expect(session.trimester).toBe('ETE');
  });

  it('should get or create session from code', async () => {
    const session = await sessionService.getOrCreateSessionFromCode('A25');
    expect(session.year).toBe(2025);
    expect(session.trimester).toBe('AUTOMNE');
  });

  it('should throw for invalid session code', async () => {
    await expect(sessionService.getOrCreateSessionFromCode('X99')).rejects.toThrow('Invalid session code: X99');
  });

  it('should get all sessions', async () => {
    await sessionService.getOrCreateSession(2024, 'HIVER');
    await sessionService.getOrCreateSession(2025, 'ETE');
    const sessions = await sessionService.getAllSessions();
    expect(sessions.length).toBe(2);
    expect(sessions.map(s => s.year)).toEqual(expect.arrayContaining([2024, 2025]));
  });

  it('should throw for session code with non-numeric year part', async () => {
    await expect(sessionService.getOrCreateSessionFromCode('EAA')).rejects.toThrow('Invalid session code: EAA');
    await expect(sessionService.getOrCreateSessionFromCode('E1A')).rejects.toThrow('Invalid session code: E1A');
    await expect(sessionService.getOrCreateSessionFromCode('E--')).rejects.toThrow('Invalid session code: E--');
  });

  it('should throw for session code with year part not two digits', async () => {
    await expect(sessionService.getOrCreateSessionFromCode('E2')).rejects.toThrow('Invalid session code: E2');
    await expect(sessionService.getOrCreateSessionFromCode('E123')).rejects.toThrow('Invalid session code: E123');
    await expect(sessionService.getOrCreateSessionFromCode('E')).rejects.toThrow('Invalid session code: E');
  });

  it('should get latest available session', async () => {
    await sessionService.getOrCreateSession(2023, 'HIVER');
    await sessionService.getOrCreateSession(2025, 'ETE');
    const latest = await sessionService.getLatestAvailableSession();
    expect(latest).toBeDefined();
    expect(latest?.year).toBe(2025);
    expect(latest?.trimester).toBe('ETE');
  });

  it('should return null if no sessions exist for latest', async () => {
    const latest = await sessionService.getLatestAvailableSession();
    expect(latest).toBeNull();
  });

  describe('getOrCreateCurrentSession error handling', () => {
    it('should log a warning and throw if trimester cannot be determined', async () => {
      const loggerWarnSpy = jest.spyOn(sessionService['logger'], 'warn');
      // Ensure getCurrentTrimester returns undefined for this test
      (sessionUtil.getCurrentTrimester as jest.Mock).mockReturnValue(undefined);
      // pass invalid date to trigger the error
      const invalidDate = new Date('0-02--25T00:00:00.000Z');
      await expect(sessionService.getOrCreateCurrentSession(invalidDate)).rejects.toThrow('Current trimester could not be determined.');
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Unable to determine the current trimester for date: Invalid Date'
      );
      loggerWarnSpy.mockRestore();
    });
  });
});
