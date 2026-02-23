# Nvidopia

**Autonomous Driving Software Iteration Optimization Platform**

A microservice-based middleware system for managing autonomous driving road-test campaigns. Nvidopia covers the full lifecycle from project planning and fleet dispatch through issue tracking with a strict state-machine workflow, real-time KPI dashboards, and bidirectional traceability graphs that meet ASPICE / ISO 26262 compliance requirements.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + TanStack Query + Recharts |
| API Gateway | Node.js + Express + kafkajs + http-proxy-middleware |
| Microservices | Node.js + Express + Mongoose + kafkajs (TypeScript) |
| Database | MongoDB 7.0 (document store + `$graphLookup`) |
| Messaging | Apache Kafka (Confluent 7.6) |
| Containers | Docker + Docker Compose V2 |
| Cloud | Google Cloud Run (single-container full-stack) |
| Package Mgmt | npm workspaces (monorepo) |

---

## Architecture

```
Vehicle Fleet → API Gateway → Kafka Topics → Microservices → MongoDB
                    ↑                                            ↑
              Frontend SPA                          Traceability ($graphLookup)
```

See [`docs/architecture.md`](docs/architecture.md) for the full architecture document.

---

## Module Overview

| Module | Path | Description | Port |
|--------|------|-------------|------|
| **BFF Gateway** | `apps/bff-gateway/` | JWT auth, request routing, Kafka producer | 3000 |
| **Frontend** | `apps/frontend/` | React 19 SPA — dashboards, issue workbench, traceability | 5173 |
| **Release Manager** | `services/release-manager/` | Project & Task CRUD, multi-stage release gates | 3001 |
| **Fleet Manager** | `services/fleet-manager/` | Vehicle pool, task-vehicle matching, Run lifecycle | 3002 |
| **Issue Workflow** | `services/issue-workflow/` | Issue state machine, triage, audit trail | 3003 |
| **Traceability** | `services/traceability/` | Forward/backward traceability via `$graphLookup` | 3004 |
| **KPI Engine** | `services/kpi-engine/` | Built-in + custom KPIs, formula engine, multi-chart viz | 3005 |
| **Fleet Simulator** | `services/fleet-simulator/` | Simulated fleet reporting, stress testing, demo data | 3006 |
| **Data Models** | `platform/data-models/` | Shared Mongoose schemas | - |
| **Eventing** | `platform/eventing/` | Kafka topic constants, producer/consumer utilities, DLQ | - |
| **Observability** | `platform/observability/` | Structured logging (Pino), trace-ID propagation | - |
| **Service Toolkit** | `platform/service-toolkit/` | Express bootstrap, health checks, error middleware | - |
| **Contracts** | `contracts/` | OpenAPI, AsyncAPI, JSON Schema | - |
| **Infrastructure** | `infra/` | Docker Compose, env templates | - |

---

## Quick Start

### Option 1: Local Development

Best for code changes with live-reload.

**Prerequisites:** Node.js >= 20, Docker, Git

```bash
# 1. Clone
git clone https://github.com/desmondhupr97-dotcom/nvidopia.git
cd nvidopia

# 2. Start infrastructure (Kafka + MongoDB)
docker compose -f infra/docker-compose.yml up -d

# 3. Install dependencies
npm install

# 4. Copy env vars
cp infra/.env.example .env

# 5. Build platform libraries
npm run build -w platform/data-models
npm run build -w platform/eventing
npm run build -w platform/observability

# 6. Start each service (separate terminal per service)
npm run dev -w apps/bff-gateway        # Gateway  :3000
npm run dev -w services/release-manager # Release  :3001
npm run dev -w services/fleet-manager   # Fleet    :3002
npm run dev -w services/issue-workflow  # Issues   :3003
npm run dev -w services/traceability    # Trace    :3004
npm run dev -w services/kpi-engine      # KPI      :3005
npm run dev -w services/fleet-simulator # Simulator:3006
npm run dev -w apps/frontend            # Frontend :5173
```

All backend services use `tsx watch` for hot-reload; frontend uses Vite HMR.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API Gateway | http://localhost:3000 |
| MongoDB Admin | http://localhost:8081 |

---

### Option 2: Docker Compose (full stack)

One command brings up all infrastructure + microservices + frontend.

**Prerequisites:** Docker

```bash
git clone https://github.com/desmondhupr97-dotcom/nvidopia.git
cd nvidopia
docker compose -f infra/docker-compose.full.yml up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API Gateway | http://localhost:3000 |
| MongoDB Admin | http://localhost:8081 |

```bash
# Stop
docker compose -f infra/docker-compose.full.yml down
```

---

### Option 3: Google Cloud Run (one-command cloud deploy)

Packages the full stack into a single container and deploys to Cloud Run. Ideal for demos and cloud testing.

**Prerequisites:** `gcloud` CLI, a [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (free tier works)

```bash
# 1. Authenticate and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud config set run/region us-central1

# 2. Deploy
gcloud run deploy nvitopia \
  --source . \
  --set-env-vars="MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/nvidopia" \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=2 \
  --timeout=300
```

After deployment, `gcloud` prints the service URL (e.g. `https://nvitopia-xxx-uc.a.run.app`).

To update after code changes, re-run the same command:

```bash
gcloud run deploy nvitopia --source .
```

> **Note:** Cloud Run deployments do not include Kafka. Ingest endpoints (`/api/ingest/*`) are unavailable without Kafka. All other CRUD and query features work normally. The fleet simulator's HTTP reporting path is unaffected.

#### Seed data into Atlas

```bash
npm install
MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/nvidopia" npx tsx platform/data-models/src/seed.ts
```

---

## Seed Data

After starting services, import sample data:

```bash
npx tsx platform/data-models/src/seed.ts
```

Inserts: 2 projects, 6 tasks, 10 runs, 20 issues, 5 vehicles, 3 requirements, 5 commits, 2 builds.

---

## Environment Variables

All variables are defined in `infra/.env.example`. Copy to `.env` at the project root.

| Variable | Default | Purpose |
|----------|---------|---------|
| `MONGO_URI` | `mongodb://nvidopia:nvidopia_dev@localhost:27017/nvidopia?authSource=admin` | All services |
| `KAFKA_BROKERS` | `localhost:9092` | Gateway, Fleet Manager, Issue Workflow, KPI Engine |
| `GATEWAY_PORT` | `3000` | BFF Gateway |
| `JWT_SECRET` | `change-me-in-production` | BFF Gateway |
| `RELEASE_MANAGER_PORT` | `3001` | Release Manager |
| `FLEET_MANAGER_PORT` | `3002` | Fleet Manager |
| `ISSUE_WORKFLOW_PORT` | `3003` | Issue Workflow |
| `TRACEABILITY_PORT` | `3004` | Traceability |
| `KPI_ENGINE_PORT` | `3005` | KPI Engine |
| `FLEET_SIMULATOR_PORT` | `3006` | Fleet Simulator |
| `VITE_API_BASE_URL` | `/api` | Frontend |

---

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/architecture.md`](docs/architecture.md) | System architecture, data model, state machines, Kafka topics, API overview |
| [`docs/dev-guide.md`](docs/dev-guide.md) | Local setup, project structure, adding services, commit conventions |
| [`README_zh.md`](README_zh.md) | Chinese README with full details |
| [`TESTME_zh.md`](TESTME_zh.md) | Chinese local testing guide |

---

## Cleanup

```bash
# Stop infrastructure containers
docker compose -f infra/docker-compose.yml down

# Stop full-stack containers
docker compose -f infra/docker-compose.full.yml down

# Wipe MongoDB data volumes
docker compose -f infra/docker-compose.yml down -v

# Delete Cloud Run service
gcloud run services delete nvitopia
```

---

## License

TBD
