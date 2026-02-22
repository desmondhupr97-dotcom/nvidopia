# Nvidopia — Developer Guide

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | ≥ 20.0.0 | LTS recommended — check with `node -v` |
| **npm** | ≥ 10 | Ships with Node 20+ |
| **Docker** | ≥ 24 | Required for Kafka & MongoDB |
| **Docker Compose** | ≥ 2.20 | V2 plugin (`docker compose`) or standalone (`docker-compose`) |
| **Git** | ≥ 2.40 | |

---

## 2. Quick Start (Local Development)

### 2.1 Clone the repository

```bash
git clone <repo-url> nvidopia
cd nvidopia
```

### 2.2 Start infrastructure (Kafka + MongoDB)

```bash
docker compose -f infra/docker-compose.yml up -d
```

This starts:

| Container | Port | Purpose |
|-----------|------|---------|
| `nvidopia-kafka` | 9092 | Kafka broker |
| `nvidopia-zookeeper` | 2181 | Kafka coordination |
| `nvidopia-mongodb` | 27017 | MongoDB 7.0 |
| `nvidopia-mongo-express` | 8081 | MongoDB admin UI |

### 2.3 Install dependencies

From the workspace root (npm workspaces will resolve all packages):

```bash
npm install
```

### 2.4 Copy environment variables

```bash
cp infra/.env.example .env
```

Or set the variables directly — see the [Environment Variables](#9-environment-variables) section below.

### 2.5 Build platform libraries

Platform packages must be built before services can import them:

```bash
npm run build -w platform/data-models
npm run build -w platform/eventing
npm run build -w platform/observability
```

### 2.6 Start each service in dev mode

Open separate terminals for each service:

```bash
# Terminal 1 — Gateway
npm run dev -w apps/bff-gateway

# Terminal 2 — Release Manager
npm run dev -w services/release-manager

# Terminal 3 — Fleet Manager
npm run dev -w services/fleet-manager

# Terminal 4 — Issue Workflow
npm run dev -w services/issue-workflow

# Terminal 5 — Traceability
npm run dev -w services/traceability

# Terminal 6 — KPI Engine
npm run dev -w services/kpi-engine

# Terminal 7 — Frontend
npm run dev -w apps/frontend
```

All backend services use `tsx watch` for hot-reload. The frontend uses Vite HMR.

---

## 3. Full Stack (Docker)

To build and run the entire platform in containers:

```bash
docker compose -f infra/docker-compose.full.yml up --build
```

> **Note:** `docker-compose.full.yml` extends the base infrastructure compose file with service containers. This file will be created as the services mature.

---

## 4. Seed Data

Populate the database with sample projects, tasks, runs, and issues:

```bash
npx tsx platform/data-models/src/seed.ts
```

Make sure MongoDB is running and `MONGO_URI` is set (defaults to `mongodb://nvidopia:nvidopia_dev@localhost:27017/nvidopia?authSource=admin`).

---

## 5. Running the E2E Smoke Test

An end-to-end script validates the full pipeline: vehicle message → Issue creation → state-machine flow → KPI query.

```bash
bash scripts/e2e-smoke.sh
```

The script expects all services and infrastructure to be running.

---

## 6. Project Structure

```
nvidopia/
├── apps/
│   ├── bff-gateway/          # API Gateway / BFF (Express, kafkajs, http-proxy-middleware)
│   │   └── src/
│   └── frontend/             # React 19 SPA (Vite, TanStack Query, Recharts)
│       └── src/
├── services/
│   ├── release-manager/      # Project & Task CRUD, release gates
│   │   └── src/
│   ├── fleet-manager/        # Vehicle pool, Task-vehicle matching, Runs
│   │   └── src/
│   ├── issue-workflow/        # Issue state machine, triage, audit log
│   │   └── src/
│   ├── traceability/         # $graphLookup forward/backward trace
│   │   └── src/
│   └── kpi-engine/           # KPI metrics query (MPI, MTTR, etc.)
│       └── src/
├── platform/
│   ├── data-models/          # Shared Mongoose schemas (Project, Task, Run, Issue, …)
│   │   └── src/
│   ├── eventing/             # Kafka topic constants, producer/consumer utils, DLQ
│   │   └── src/
│   └── observability/        # Pino logger, trace-ID propagation
│       └── src/
├── contracts/
│   ├── openapi/              # OpenAPI 3.x specs per service
│   ├── asyncapi/             # AsyncAPI event specs
│   └── generated/            # Auto-generated typed API clients
├── infra/
│   ├── docker-compose.yml    # Kafka + MongoDB + Mongo Express
│   └── .env.example          # Environment variable template
├── docs/
│   ├── architecture.md       # Architecture document
│   └── dev-guide.md          # This file
├── scripts/                  # Utility & E2E scripts
├── README_zh.md              # Chinese project guide
├── TESTME_zh.md              # Chinese testing guide
└── package.json              # Workspace root (npm workspaces)
```

---

## 7. Adding a New Microservice

1. **Create the directory** under `services/`:

   ```bash
   mkdir -p services/my-service/src
   ```

2. **Initialize `package.json`**:

   ```bash
   cd services/my-service
   npm init -y --scope=@nvidopia
   ```

   Set `"private": true` and add standard scripts:

   ```json
   {
     "scripts": {
       "dev": "tsx watch src/index.ts",
       "build": "tsc",
       "start": "node dist/index.js"
     }
   }
   ```

3. **Install common dependencies**:

   ```bash
   npm install express cors mongoose kafkajs dotenv
   npm install -D typescript @types/express @types/cors tsx
   ```

4. **Create `tsconfig.json`** — extend or mirror the pattern from an existing service.

5. **Create `src/index.ts`** with the standard Express bootstrap:

   ```typescript
   import express from 'express';
   import cors from 'cors';
   import dotenv from 'dotenv';

   dotenv.config();

   const PORT = parseInt(process.env.MY_SERVICE_PORT ?? '30XX', 10);
   const app = express();

   app.use(cors());
   app.use(express.json());

   app.get('/health', (_req, res) => res.json({ status: 'ok' }));

   app.listen(PORT, () => {
     console.log(`[my-service] Listening on port ${PORT}`);
   });
   ```

6. **Register the proxy route** in `apps/bff-gateway/src/routes/proxy.ts` so the gateway forwards `/api/my-service/*` to the new service.

7. **Add an OpenAPI spec** at `contracts/openapi/my-service.yaml`.

8. **Create a `SUB_MODULE_PLAN.md`** in the service directory following the existing template.

9. **Add the port** to `infra/.env.example`.

10. **Update `PLAN.md`** to include the new module in the sub-module status table.

---

## 8. Git Commit Convention

Follow the commit message format defined in `PLAN.md`:

| Type | Format | Example |
|------|--------|---------|
| **Plan / docs** | `docs(plan): update <module> sub module plan` | `docs(plan): update fleet-manager sub module plan` |
| **Feature** | `feat(<service>): implement <capability>` | `feat(issue-workflow): implement state machine engine` |
| **Bug fix** | `fix(<service>): <description>` | `fix(bff-gateway): correct JWT expiry check` |
| **Test** | `test(<module>): complete acceptance for <scope>` | `test(kpi-engine): complete acceptance for MPI query` |
| **Infra** | `chore(infra): <description>` | `chore(infra): add KPI engine to docker-compose.full` |

**Workflow:**

1. Update `SUB_MODULE_PLAN.md` / `PLAN.md` status fields first.
2. Stage and commit code changes.
3. Push to remote.

---

## 9. Environment Variables

All variables are defined in `infra/.env.example`. Copy to `.env` in the project root.

| Variable | Default | Used By |
|----------|---------|---------|
| `MONGO_URI` | `mongodb://nvidopia:nvidopia_dev@localhost:27017/nvidopia?authSource=admin` | All microservices |
| `MONGO_DB_NAME` | `nvidopia` | All microservices |
| `KAFKA_BROKERS` | `localhost:9092` | Gateway, Fleet Manager, Issue Workflow, KPI Engine, Eventing |
| `GATEWAY_PORT` | `3000` | BFF Gateway |
| `JWT_SECRET` | `change-me-in-production` | BFF Gateway |
| `RELEASE_MANAGER_PORT` | `3001` | Release Manager |
| `FLEET_MANAGER_PORT` | `3002` | Fleet Manager |
| `ISSUE_WORKFLOW_PORT` | `3003` | Issue Workflow |
| `TRACEABILITY_PORT` | `3004` | Traceability |
| `KPI_ENGINE_PORT` | `3005` | KPI Engine |
| `VITE_API_BASE_URL` | `http://localhost:3000/api` | Frontend |
| `LOG_LEVEL` | `debug` | All services (via `@nvidopia/observability`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OpenTelemetry export (reserved) |
