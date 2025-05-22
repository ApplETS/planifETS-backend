import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Session, Trimester } from '@prisma/client';

import { getCurrentTrimester } from '../common/utils/session/sessionUtil';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(SessionService.name);

  private readonly trimesterMap: Record<string, Trimester> = {
    A: Trimester.AUTOMNE,
    H: Trimester.HIVER,
    E: Trimester.ETE,
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
    const year = parseInt(`20${sessionCode.slice(1)}`, 10);
    const trimester = this.trimesterMap[sessionCode[0].toUpperCase()];

    if (!year || !trimester) {
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

  public async createSession(
    data: Prisma.SessionCreateInput,
  ): Promise<Session> {
    return this.prisma.session.create({
      data,
    });
  }
}
