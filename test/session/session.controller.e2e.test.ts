import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/prisma/prisma.service';
import { serializeSessionContract } from '../test-utils/api-contract-builders';
import { closeE2eTestApp, createE2eTestApp } from '../test-utils/e2e-app';
import { seedSession } from '../test-utils/prisma-fixtures';

describe('SessionController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    ({ app, prisma } = await createE2eTestApp());
  });

  afterEach(async () => {
    await closeE2eTestApp(app);
  });

  describe('GET /sessions/latest-available', () => {
    it('returns the latest available session', async () => {
      await seedSession(prisma, {
        year: 2025,
        trimester: 'ETE',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        updatedAt: new Date('2026-02-01T00:00:00.000Z'),
      });
      const latestSession = await seedSession(prisma, {
        year: 2026,
        trimester: 'AUTOMNE',
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: new Date('2026-03-02T00:00:00.000Z'),
      });

      const { status, body } = await request(app.getHttpServer()).get(
        '/sessions/latest-available',
      );

      expect(status).toBe(200);
      expect(body).toStrictEqual(serializeSessionContract(latestSession));
    });

    it('returns an empty 200 response when no session exists', async () => {
      const response = await request(app.getHttpServer()).get(
        '/sessions/latest-available',
      );

      expect(response.status).toBe(200);
      expect(response.text).toBe('');
    });
  });
});
