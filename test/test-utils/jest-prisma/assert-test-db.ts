export function assertIsTestDatabase(databaseUrl: string): void {
  const url = new URL(databaseUrl);
  const dbName = url.pathname.replace(/^\//, '');

  if (dbName !== 'planifetsDB_test') {
    throw new Error(
      `Refusing to run tests against "${dbName}". Expected db name = "planifetsDB_test".`
    );
  }
}
