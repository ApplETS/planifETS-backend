import { Injectable } from '@nestjs/common';
import { Prisma, Session, Trimester } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  public async session(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { id },
    });
  }

  public async sessions(): Promise<Session[]> {
    return this.prisma.session.findMany();
  }

  public async createSession(
    createSessionDto: Prisma.SessionCreateInput,
  ): Promise<Session> {
    return this.prisma.session.create({
      data: createSessionDto,
    });
  }

  public async upsertSession(
    id: string,
    updateSessionDto: Prisma.SessionUpdateInput,
  ): Promise<Session> {
    const createSessionDto: Prisma.SessionCreateInput = {
      ...updateSessionDto,
      id,
      trimester: updateSessionDto.trimester as Trimester,
      year: updateSessionDto.year as number,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.prisma.session.upsert({
      where: { id },
      update: {
        ...updateSessionDto,
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
