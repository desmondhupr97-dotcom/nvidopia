# Nvidopia

**Autonomous Driving Software Iteration Optimization Platform**

A microservice-based middleware system for managing autonomous driving road-test campaigns. Nvidopia covers the full lifecycle from project planning and fleet dispatch through issue tracking with a strict state-machine workflow, real-time KPI dashboards, and bidirectional traceability graphs that meet ASPICE / ISO 26262 compliance requirements.

---

## Quick Start

### Prerequisites

- Node.js ≥ 20, Docker, Docker Compose

### 1. Start infrastructure

```bash
docker-compose -f infra/docker-compose.yml up -d
```

### 2. Install dependencies & build platform libraries

```bash
npm install
npm run build -w platform/data-models
npm run build -w platform/eventing
npm run build -w platform/observability
```

### 3. Run services

```bash
# Copy environment variables
cp infra/.env.example .env

# Start each service (in separate terminals)
npm run dev -w apps/bff-gateway
npm run dev -w services/release-manager
npm run dev -w services/fleet-manager
npm run dev -w services/issue-workflow
npm run dev -w services/traceability
npm run dev -w services/kpi-engine
npm run dev -w apps/frontend
```

### Or run everything in Docker

```bash
docker-compose -f infra/docker-compose.full.yml up --build
```

---

## Architecture

See the full architecture document at [`docs/architecture.md`](docs/architecture.md).

```
Vehicle Fleet → API Gateway → Kafka Topics → Microservices → MongoDB
                    ↑                                            ↑
              Frontend SPA                          Traceability ($graphLookup)
```

---

## Module Overview

| Module | Path | Description |
|--------|------|-------------|
| **BFF Gateway** | `apps/bff-gateway/` | JWT auth, request routing, Kafka producer |
| **Frontend** | `apps/frontend/` | React 19 SPA — dashboards, issue workbench, traceability views |
| **Release Manager** | `services/release-manager/` | Project & Task CRUD, multi-stage release gates |
| **Fleet Manager** | `services/fleet-manager/` | Vehicle pool, task-vehicle matching, Run lifecycle |
| **Issue Workflow** | `services/issue-workflow/` | Issue state machine, triage, audit trail |
| **Traceability** | `services/traceability/` | Forward/backward traceability via `$graphLookup` |
| **KPI Engine** | `services/kpi-engine/` | Metric queries — MPI, MTTR, regression rate, convergence |
| **Data Models** | `platform/data-models/` | Shared Mongoose schemas |
| **Eventing** | `platform/eventing/` | Kafka topic constants, producer/consumer utilities, DLQ |
| **Observability** | `platform/observability/` | Structured logging (Pino), trace-ID propagation |
| **Contracts** | `contracts/` | OpenAPI, AsyncAPI, JSON Schema, generated typed clients |
| **Infrastructure** | `infra/` | Docker Compose for Kafka, MongoDB, Mongo Express |

---

## Documentation

| Document | Description |
|----------|-------------|
| [`PLAN.md`](PLAN.md) | Master project plan — milestones, sub-module status, acceptance criteria |
| [`docs/architecture.md`](docs/architecture.md) | System architecture, data model, state machines, Kafka topics, API overview |
| [`docs/dev-guide.md`](docs/dev-guide.md) | Local setup, project structure, adding services, commit conventions |
| [`INIT_PRD.md`](INIT_PRD.md) | Original product requirements document |

---

## License

TBD
