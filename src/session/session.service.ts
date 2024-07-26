import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Session, Trimester } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  private logger = new Logger(SessionService.name);

  public async getSession(id: string): Promise<Session | null> {
    this.logger.log('getSession', id);

    return this.prisma.session.findUnique({
      where: { id },
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

  public async upsertSession(
    id: string,
    data: Prisma.SessionUpdateInput,
  ): Promise<Session> {
    const createSessionDto: Prisma.SessionCreateInput = {
      ...data,
      id,
      trimester: data.trimester as Trimester,
      year: data.year as number,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.prisma.session.upsert({
      where: { id },
      update: {
        ...data,
        updatedAt: new Date(),
      },
      create: createSessionDto,
    });
  }

  public async removeSession(id: string): Promise<Session> {
    return this.prisma.session.delete({
      where: { id },
    });
  }
}
