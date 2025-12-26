Library: https://github.com/Quramy/jest-prisma/tree/main

# When to use jestPrisma vs the normal Prisma client:

## Use `jestPrisma.originalClient`:
- Only for test setup/teardown (e.g., seeding, cleaning up data) in beforeAll, afterAll, or global setup files.
- Never use it in your application code or inside your test cases.

`PrismaService` can't be used in `beforeAll`/`afterAll` because those run outside of jest-prisma's transaction management.

## Use `PrismaService` (which is mocked to use jestPrisma.client):
- In all your application code and inside your test cases (e.g., when calling service methods, repositories, or controllers).
- This ensures all test logic runs inside jest-prisma's managed transactions for isolation.

## Never use 
Never use jestPrisma.client or jestPrisma.originalClient directly in your app or test logic (except for setup/teardown as above).

## Summary:
- Setup/teardown: `jestPrisma.originalClient`
- App code & test logic: `PrismaService` (DI, which uses `jestPrisma.client` under the hood)
- Never: Direct use of `jestPrisma.client` or `jestPrisma.originalClient` in app/test logic

This ensures test isolation, correct transaction handling, and avoids data visibility issues.


## Exceptions
- DateTime fields: If you encounter errors or unexpected behavior with DateTime fields (e.g., type errors or timezone issues), consider using a single-context Jest environment (see jest-prisma README “Workaround for DateTime invocation error”). \
For setup/teardown, you can use `jestPrisma.originalClient` to set DateTime fields directly.
