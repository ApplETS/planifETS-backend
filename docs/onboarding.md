# Onboarding

## Requirements

- Node.js 22
- Yarn
- PostgreSQL 16+
- VS Code

## Optional

- Docker Desktop
- A database IDE such as [DBeaver Community](https://dbeaver.io/download/)

## Option A - Docker (recommended)

### 1. Clone the project

```bash
git clone git@github.com:ApplETS/planifETS-backend.git
cd planifETS-backend
```

### 2. Create the environment file

```bash
cp .env.example .env
```

The default values work out of the box for Docker. The compose file connects the app to the `db` service automatically, so you do not need to change `DATABASE_URL` for container-based development.

> **Note:** On Windows, ports `3001` and `5432` may be reserved by Hyper-V. The compose file maps the app to host port `3501` and PostgreSQL to `5433` to avoid conflicts.

### 3. Start the stack

**Development** (hot reload, source mounted as volume):

```bash
docker compose --profile dev up --build
```

**Production** (full optimized build):

```bash
docker compose --profile production up --build
```

Once running:

- Swagger UI: `http://localhost:3501/api/docs`
- Liveness probe: `http://localhost:3501/api/health/live`
- Readiness probe: `http://localhost:3501/api/health/ready`
- Diagnostic health view: `http://localhost:3501/api/health`
- In Kubernetes, use the liveness probe for process checks and the readiness probe for Postgres and Qdrant availability

### 4. Populate the database

Use Swagger to trigger the development-only jobs endpoint:

1. Open `http://localhost:3501/api/docs`
2. Find `POST /api/jobs/run-workers`
3. Run it with the default request body to execute the full pipeline

Default body:

```json
{
  "processAllJobs": true,
  "processPrograms": false,
  "processCourses": false,
  "processCourseInstances": false,
  "processProgramCourses": false,
  "processSessions": false
}
```

---

## Option B - Local setup

### 1. Clone the project

```bash
git clone git@github.com:ApplETS/planifETS-backend.git
cd planifETS-backend
yarn install
yarn build
```

If you use `nvm`, run `nvm use` first.

### 2. Set up PostgreSQL

Install PostgreSQL and keep the default settings.

Prisma can usually create the database during `prisma migrate dev` if your PostgreSQL user has the required permissions. If not, create a database named `planifetsDB` manually before running migrations.

### 3. Create the environment file

Duplicate `.env.example` in the project root and rename the copy to `.env`.

For a default local PostgreSQL setup:

```env
APP_ENV=development
PORT=3001
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/planifetsDB?schema=public"
FRONTEND_URL="http://localhost:3000"
QDRANT_URL="http://localhost:6333"
```

If you use a custom PostgreSQL username, password, or Docker on port `5433`, adjust the connection string accordingly.

Examples:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/planifetsDB?schema=public"
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/planifetsDB?schema=public"
```

### 4. Run Prisma

Generate the Prisma client:

```bash
yarn prisma:generate
```

Apply migrations:

```bash
yarn prisma:migrate
```

If you want to preview a new migration before applying it:

```bash
yarn prisma:preview
```

### 5. Start the app

```bash
yarn dev
```

Once the server is running:

- Swagger UI is available at `http://localhost:3001/api/docs`
- Liveness probe is available at `http://localhost:3001/api/health/live`
- Readiness probe is available at `http://localhost:3001/api/health/ready`
- Diagnostic health view is available at `http://localhost:3001/api/health`

### 6. Populate the database

Use Swagger to trigger the development-only jobs endpoint:

1. Open `http://localhost:3001/api/docs`
2. Find `POST /api/jobs/run-workers`
3. Run it with the default request body to execute the full pipeline

Default body:

```json
{
  "processAllJobs": true,
  "processPrograms": false,
  "processCourses": false,
  "processCourseInstances": false,
  "processProgramCourses": false,
  "processSessions": false
}
```

This will fetch and synchronize the initial program, course, course-instance, and prerequisite data from the external sources.

Have fun! 🐿️

## References

- [NestJS in 100 Seconds](https://www.youtube.com/watch?v=0M8AYU_hPas)
- [NestJS documentation](https://docs.nestjs.com/)
- [Prisma documentation](https://www.prisma.io/docs)
