# Useful Commands

## 🐳 Docker

```bash
# Start the full dev stack (NestJS + PostgreSQL + Qdrant) with hot reload
docker compose --profile dev up --build

# Start the production stack
docker compose --profile production up --build

# Rebuild a single service without restarting everything (ex: only the backend container)
docker compose --profile dev up --build nestjs-app-dev

# Follow logs for the app container only
docker compose --profile dev logs -f nestjs-app-dev

# Follow logs for all dev containers (app + db + qdrant)
docker compose --profile dev logs -f

# Stop all running containers
docker ps -q | xargs -r docker stop

# Full cleanup — removes containers, images, volumes, and networks (destructive!)
docker system prune -af --volumes
```

## 🧑‍💻 Development

```bash
# Install dependencies
yarn install

# Start the app locally with hot reload
yarn dev

# Type check without emitting (CI-safe)
yarn typecheck

# Lint all source files
yarn lint

# Lint and auto-fix
yarn lint:fix

# Format source files with Prettier
yarn format
```

## 🗄️ Prisma

```bash
# Generate the Prisma client after schema changes
yarn prisma:generate

# Apply pending migrations to the local DB
yarn prisma:migrate

# Preview a new migration SQL without applying it
yarn prisma:preview

# Seed the database
yarn prisma:seed

# Apply migrations in production (no prompt)
yarn prisma:migrate-prod
```

## 🧪 Tests

```bash
# Run unit tests
yarn test

# Run unit tests with coverage report
yarn test:cov

# Run integration tests
yarn test:integration

# Run e2e tests
yarn test:e2e

# Run all test suites
yarn test:all
```

## 🔍 Misc

```bash
# Find unused exports and dependencies
yarn knip

# Build the production bundle
yarn build
```
