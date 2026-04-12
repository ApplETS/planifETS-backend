# File naming

- `*.test.ts`: unit tests
- `*.integration.test.ts`: integration tests
- `*.e2e.test.ts`: end-to-end tests

# Test Suites

- `yarn test` or `yarn test:unit`: unit tests and deterministic fixture-based tests
- `yarn test:cov`: unit-test coverage
- `yarn test:integration`: database-backed or live external dependency tests
- `yarn test:e2e`: end-to-end tests that boot the Nest app and hit HTTP routes
