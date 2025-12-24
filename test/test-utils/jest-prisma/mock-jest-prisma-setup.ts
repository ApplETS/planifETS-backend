jest.mock('../../../src/prisma/prisma.service', () => ({
  PrismaService: jest.fn(() => jestPrisma.client),
}));
