import { Logger } from '@nestjs/common';
import { Session, Trimester } from '@prisma/client';

jest.mock('../../src/common/utils/session/sessionUtil', () => ({
  getCurrentTrimester: jest.fn(),
}));

import * as sessionUtil from '../../src/common/utils/session/sessionUtil';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SessionService } from '../../src/session/session.service';

describe('SessionService', () => {
  let service: SessionService;
  let serviceLogger: Logger;
  let prismaMock: {
    session: {
      upsert: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  const buildSession = (
    year: number,
    trimester: Trimester,
  ): Session => ({
    year,
    trimester,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  });

  beforeEach(() => {
    prismaMock = {
      session: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    service = new SessionService(prismaMock as unknown as PrismaService);
    serviceLogger = (service as unknown as { logger: Logger }).logger;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getOrCreateSession', () => {
    it('upserts a session using the composite key and sets updatedAt', async () => {
      const session = buildSession(2026, Trimester.AUTOMNE);
      prismaMock.session.upsert.mockResolvedValue(session);

      await expect(
        service.getOrCreateSession(2026, Trimester.AUTOMNE),
      ).resolves.toBe(session);

      expect(prismaMock.session.upsert).toHaveBeenCalledWith({
        where: {
          year_trimester: {
            year: 2026,
            trimester: Trimester.AUTOMNE,
          },
        },
        update: {},
        create: {
          year: 2026,
          trimester: Trimester.AUTOMNE,
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getOrCreateCurrentSession', () => {
    it('uses the current trimester helper and upserts the matching session', async () => {
      const date = new Date('2025-06-15T00:00:00.000Z');
      const session = buildSession(2025, Trimester.ETE);
      (sessionUtil.getCurrentTrimester as jest.Mock).mockReturnValue(
        Trimester.ETE,
      );
      prismaMock.session.upsert.mockResolvedValue(session);

      await expect(service.getOrCreateCurrentSession(date)).resolves.toBe(
        session,
      );

      expect(sessionUtil.getCurrentTrimester).toHaveBeenCalledWith(date);
      expect(prismaMock.session.upsert).toHaveBeenCalledWith({
        where: {
          year_trimester: {
            year: 2025,
            trimester: Trimester.ETE,
          },
        },
        update: {},
        create: {
          year: 2025,
          trimester: Trimester.ETE,
        },
      });
    });

    it('logs the ISO date and throws when no trimester can be determined', async () => {
      const date = new Date('2025-12-24T00:00:00.000Z');
      const loggerWarnSpy = jest
        .spyOn(serviceLogger, 'warn')
        .mockImplementation(() => { });
      (sessionUtil.getCurrentTrimester as jest.Mock).mockReturnValue(
        undefined,
      );

      await expect(service.getOrCreateCurrentSession(date)).rejects.toThrow(
        'Current trimester could not be determined.',
      );

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        `Unable to determine the current trimester for date: ${date.toISOString()}`,
      );
      expect(prismaMock.session.upsert).not.toHaveBeenCalled();
    });

    it('logs "Invalid Date" for invalid dates before throwing', async () => {
      const invalidDate = new Date('invalid');
      const loggerWarnSpy = jest
        .spyOn(serviceLogger, 'warn')
        .mockImplementation(() => { });
      (sessionUtil.getCurrentTrimester as jest.Mock).mockReturnValue(
        undefined,
      );

      await expect(
        service.getOrCreateCurrentSession(invalidDate),
      ).rejects.toThrow('Current trimester could not be determined.');

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Unable to determine the current trimester for date: Invalid Date',
      );
      expect(prismaMock.session.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getOrCreateSessionFromCode', () => {
    it('parses lowercase session codes before upserting the session', async () => {
      const session = buildSession(2025, Trimester.HIVER);
      prismaMock.session.upsert.mockResolvedValue(session);

      await expect(service.getOrCreateSessionFromCode('h25')).resolves.toBe(
        session,
      );

      expect(prismaMock.session.upsert).toHaveBeenCalledWith({
        where: {
          year_trimester: {
            year: 2025,
            trimester: Trimester.HIVER,
          },
        },
        update: {},
        create: {
          year: 2025,
          trimester: Trimester.HIVER,
        },
      });
    });

    it.each([
      25 as unknown as string,
      '',
      'A2',
      'A250',
    ])('throws when the session code is not a 3-character string: %p', async (
      sessionCode,
    ) => {
      await expect(
        service.getOrCreateSessionFromCode(sessionCode),
      ).rejects.toThrow(`Invalid session code: ${sessionCode}`);
      expect(prismaMock.session.upsert).not.toHaveBeenCalled();
    });

    it.each(['AA5', 'A-5', 'A2A'])(
      'throws when the year portion is not two digits: %s',
      async (sessionCode) => {
        await expect(
          service.getOrCreateSessionFromCode(sessionCode),
        ).rejects.toThrow(`Invalid session code: ${sessionCode}`);
        expect(prismaMock.session.upsert).not.toHaveBeenCalled();
      },
    );

    it('throws when the trimester letter is unknown', async () => {
      await expect(service.getOrCreateSessionFromCode('X25')).rejects.toThrow(
        'Invalid session code: X25',
      );
      expect(prismaMock.session.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getAllSessions', () => {
    it('returns all sessions from Prisma', async () => {
      const sessions = [
        buildSession(2024, Trimester.HIVER),
        buildSession(2025, Trimester.ETE),
      ];
      prismaMock.session.findMany.mockResolvedValue(sessions);

      await expect(service.getAllSessions()).resolves.toStrictEqual(sessions);
      expect(prismaMock.session.findMany).toHaveBeenCalledWith();
    });
  });

  describe('getLatestAvailableSession', () => {
    it('returns the latest session and logs it verbosely', async () => {
      const latestSession = buildSession(2026, Trimester.AUTOMNE);
      const loggerVerboseSpy = jest
        .spyOn(serviceLogger, 'verbose')
        .mockImplementation(() => { });
      prismaMock.session.findFirst.mockResolvedValue(latestSession);

      await expect(service.getLatestAvailableSession()).resolves.toBe(
        latestSession,
      );

      expect(prismaMock.session.findFirst).toHaveBeenCalledWith({
        orderBy: [{ year: 'desc' }, { trimester: 'desc' }],
      });
      expect(loggerVerboseSpy).toHaveBeenCalledWith(
        'Found latest session: 2026-AUTOMNE',
      );
    });

    it('returns null and logs a warning when no sessions exist', async () => {
      const loggerWarnSpy = jest
        .spyOn(serviceLogger, 'warn')
        .mockImplementation(() => { });
      prismaMock.session.findFirst.mockResolvedValue(null);

      await expect(service.getLatestAvailableSession()).resolves.toBeNull();

      expect(prismaMock.session.findFirst).toHaveBeenCalledWith({
        orderBy: [{ year: 'desc' }, { trimester: 'desc' }],
      });
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'No sessions found in the database',
      );
    });
  });
});
