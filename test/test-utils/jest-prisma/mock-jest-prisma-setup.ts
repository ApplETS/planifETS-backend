jest.mock('../../../src/prisma/prisma.service', () => ({
  PrismaService: jest.fn(() => jestPrisma.client),
}));

// Global teardown for Prisma after all tests
afterAll(async () => {
  if (jestPrisma?.originalClient) {
    await jestPrisma.originalClient.$disconnect();
  }
});
