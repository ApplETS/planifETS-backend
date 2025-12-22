import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Session, Trimester } from '@prisma/client';

import { getCurrentTrimester } from '../common/utils/session/sessionUtil';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) { }

  private readonly logger = new Logger(SessionService.name);

  private readonly trimesterMap: Record<string, Trimester> = {
    A: Trimester.AUTOMNE,
    H: Trimester.HIVER,
    E: Trimester.ETE
  };

  public async getOrCreateSession(
    year: number,
    trimester: Trimester,
  ): Promise<Session> {
    return this.prisma.session.upsert({
      where: {
        year_trimester: {
          year,
          trimester,
        },
      },
      update: {},
      create: {
        year,
        trimester,
        updatedAt: new Date(),
      },
    });
  }

  public async getOrCreateCurrentSession(
    date: Date = new Date(),
  ): Promise<Session> {
    const trimester = getCurrentTrimester(date);
    if (!trimester) {
      this.logger.warn(
        `Unable to determine the current trimester for date: ${date.toISOString()}`,
      );
      throw new Error('Current trimester could not be determined.');
    }

    const year = date.getFullYear();

    return this.prisma.session.upsert({
      where: {
        year_trimester: {
          year,
          trimester,
        },
      },
      update: {},
      create: {
        year,
        trimester,
      },
    });
  }

  private parseSessionCode(sessionCode: string): {
    year: number;
    trimester: Trimester;
  } {
    // Require code to be exactly 3 characters: 1 letter + 2 digits
    if (typeof sessionCode !== 'string' || sessionCode.length !== 3) {
      throw new Error(`Invalid session code: ${sessionCode}`);
    }
    const trimester = this.trimesterMap[sessionCode[0].toUpperCase()];
    const yearPart = sessionCode.slice(1);
    // Year part must be two digits and numeric
    if (!/^[0-9]{2}$/.test(yearPart)) {
      throw new Error(`Invalid session code: ${sessionCode}`);
    }
    const year = parseInt(`20${yearPart}`, 10);
    if (!trimester) {
      throw new Error(`Invalid session code: ${sessionCode}`);
    }
    return { year, trimester };
  }

  public async getOrCreateSessionFromCode(
    sessionCode: string,
  ): Promise<Session> {
    const { year, trimester } = this.parseSessionCode(sessionCode);
    return this.prisma.session.upsert({
      where: { year_trimester: { year, trimester } },
      update: {},
      create: { year, trimester },
    });
  }

  public async getAllSessions(): Promise<Session[]> {
    return this.prisma.session.findMany();
  }

  public async getLatestAvailableSession(): Promise<Session | null> {
    const latestSession = await this.prisma.session.findFirst({
      orderBy: [{ year: 'desc' }, { trimester: 'desc' }],
    });

    if (!latestSession) {
      this.logger.warn('No sessions found in the database');
      return null;
    }

    this.logger.verbose(
      `Found latest session: ${latestSession.year}-${latestSession.trimester}`,
    );
    return latestSession;
  }

  public async createSession(
    data: Prisma.SessionCreateInput,
  ): Promise<Session> {
    return this.prisma.session.create({
      data,
    });
  }
}
