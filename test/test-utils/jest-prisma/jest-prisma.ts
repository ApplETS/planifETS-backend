import type { PrismaClient } from '@prisma/client';

export const prisma: PrismaClient = jestPrisma.client;
