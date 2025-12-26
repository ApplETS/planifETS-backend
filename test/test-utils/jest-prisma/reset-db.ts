import { PrismaClient } from '@prisma/client';

type PgTableRow = { tablename: string };

function quoteIdent(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export async function resetDatabase(databaseUrl: string): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    const tables = await prisma.$queryRaw<PgTableRow[]>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> '_prisma_migrations'
    `;

    if (tables.length === 0) return;

    const fqTables = tables.map((t) => `${quoteIdent('public')}.${quoteIdent(t.tablename)}`);
    const sql = `TRUNCATE TABLE ${fqTables.join(', ')} RESTART IDENTITY CASCADE;`;

    await prisma.$executeRawUnsafe(sql);
  } finally {
    await prisma.$disconnect();
  }
}
