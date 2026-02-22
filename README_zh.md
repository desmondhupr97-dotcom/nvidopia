# Nvidopia - 自动驾驶软件迭代优化中台

一套基于微服务架构的自动驾驶路测管理中台系统，覆盖从项目规划、车队调度、测试执行到缺陷闭环追踪的全生命周期，内置 KPI 看板与满足 ASPICE / ISO 26262 要求的双向追溯图谱。

---

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端 | React 19 + TypeScript + Vite + TanStack Query + Recharts |
| API 网关 | Node.js + Express + kafkajs + http-proxy-middleware |
| 微服务 | Node.js + Express + Mongoose + kafkajs (TypeScript) |
| 数据库 | MongoDB 7.0（文档存储 + `$graphLookup` 图查询） |
| 消息队列 | Apache Kafka（Confluent 7.6） |
| 容器化 | Docker + Docker Compose V2 |
| 包管理 | npm workspaces（monorepo） |

---

## 系统架构

```
路测车队 → API 网关 → Kafka Topics → 微服务集群 → MongoDB
               ↑                                       ↑
          前端 SPA                          追溯服务（$graphLookup）
```

详细架构文档参见 [`docs/architecture.md`](docs/architecture.md)。

---

## 模块总览

| 模块 | 目录 | 职责 | 端口 |
|------|------|------|------|
| BFF 网关 | `apps/bff-gateway/` | JWT 鉴权、请求路由、Kafka 数据接入 | 3000 |
| 前端应用 | `apps/frontend/` | SPA 界面 —— 看板、Issue 工作台、追溯可视化 | 5173 |
| 发布管理服务 | `services/release-manager/` | Project / Task CRUD、多级发布关卡（Smoke→Gray→Freeze） | 3001 |
| 车队调度服务 | `services/fleet-manager/` | 车辆资源池、Task-车辆匹配、Run 生命周期 | 3002 |
| Issue 工作流服务 | `services/issue-workflow/` | Issue 状态机、人工分诊、审计轨迹 | 3003 |
| 追溯服务 | `services/traceability/` | 正反向追溯（`$graphLookup`）、覆盖率统计 | 3004 |
| KPI 引擎 | `services/kpi-engine/` | MPI、MTTR、回归通过率、车队利用率、缺陷收敛趋势 | 3005 |
| 数据模型 | `platform/data-models/` | 共享 Mongoose Schema 库 | - |
| 事件平台 | `platform/eventing/` | Kafka Topic 常量、Producer/Consumer 工具、DLQ | - |
| 可观测性 | `platform/observability/` | 结构化日志（Pino）、Trace-ID 传播 | - |
| 契约管理 | `contracts/` | OpenAPI / AsyncAPI / JSON Schema | - |
| 基础设施 | `infra/` | Docker Compose、环境变量模板 | - |

---

## 前置要求

| 工具 | 版本 | Windows 安装方式 | macOS 安装方式 |
|------|------|------------------|----------------|
| Node.js | >= 20 LTS | [nodejs.org](https://nodejs.org) 下载 .msi 安装包，或 `winget install OpenJS.NodeJS.LTS` | `brew install node@20` |
| Docker Desktop | >= 24 | [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)（需开启 WSL2 或 Hyper-V） | `brew install --cask docker` 或从 [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/) 下载 |
| Git | >= 2.40 | [git-scm.com](https://git-scm.com/download/win) | `brew install git` |

> Docker Desktop 自带 `docker compose` V2 插件，无需额外安装。

---

## 快速开始

### 方式一：Docker 全栈一键启动（推荐新手）

适用于 Windows 和 macOS，只需安装好 Docker Desktop 即可。

```bash
# 1. 克隆仓库
git clone https://github.com/desmondhupr97-dotcom/nvidopia.git
cd nvidopia

# 2. 一键启动所有基础设施 + 微服务 + 前端
docker compose -f infra/docker-compose.full.yml up --build
```

启动后可访问：

| 服务 | 地址 |
|------|------|
| 前端界面 | http://localhost:5173 |
| API 网关 | http://localhost:3000 |
| MongoDB 管理界面 | http://localhost:8081 |

停止所有容器：

```bash
docker compose -f infra/docker-compose.full.yml down
```

---

### 方式二：本地开发模式

适合需要修改代码并实时调试的场景。以下分别给出 macOS 和 Windows 的操作步骤。

#### macOS / Linux

```bash
# 1. 克隆仓库
git clone https://github.com/desmondhupr97-dotcom/nvidopia.git
cd nvidopia

# 2. 启动基础设施（Kafka + MongoDB）
docker compose -f infra/docker-compose.yml up -d

# 3. 安装依赖
npm install

# 4. 复制环境变量
cp infra/.env.example .env

# 5. 构建平台公共库
npm run build -w platform/data-models
npm run build -w platform/eventing
npm run build -w platform/observability

# 6. 分别启动各服务（各自开一个终端窗口）
npm run dev -w apps/bff-gateway        # 网关 :3000
npm run dev -w services/release-manager # 发布管理 :3001
npm run dev -w services/fleet-manager   # 车队调度 :3002
npm run dev -w services/issue-workflow  # Issue工作流 :3003
npm run dev -w services/traceability    # 追溯服务 :3004
npm run dev -w services/kpi-engine      # KPI引擎 :3005
npm run dev -w apps/frontend            # 前端 :5173
```

#### Windows (PowerShell)

```powershell
# 1. 克隆仓库
git clone https://github.com/desmondhupr97-dotcom/nvidopia.git
cd nvidopia

# 2. 启动基础设施（Kafka + MongoDB）
docker compose -f infra/docker-compose.yml up -d

# 3. 安装依赖
npm install

# 4. 复制环境变量
copy infra\.env.example .env

# 5. 构建平台公共库
npm run build -w platform/data-models
npm run build -w platform/eventing
npm run build -w platform/observability

# 6. 分别启动各服务（各自开一个终端窗口）
npm run dev -w apps/bff-gateway        # 网关 :3000
npm run dev -w services/release-manager # 发布管理 :3001
npm run dev -w services/fleet-manager   # 车队调度 :3002
npm run dev -w services/issue-workflow  # Issue工作流 :3003
npm run dev -w services/traceability    # 追溯服务 :3004
npm run dev -w services/kpi-engine      # KPI引擎 :3005
npm run dev -w apps/frontend            # 前端 :5173
```

> Windows 上 `npm run dev` 等命令在 PowerShell 和 CMD 中均可运行，无需 Git Bash。

所有后端服务使用 `tsx watch` 热重载，前端使用 Vite HMR。

---

### 导入种子数据

启动服务后，导入示例数据：

```bash
npx tsx platform/data-models/src/seed.ts
```

此脚本会向 MongoDB 注入示例数据：2 个项目、6 个任务、10 次测试过程、20 个 Issue、5 辆车、3 条需求、5 个代码提交、2 个构建版本。

---

## 容器列表

| 容器 | 端口 | 说明 |
|------|------|------|
| nvidopia-kafka | 9092 | Kafka Broker |
| nvidopia-zookeeper | 2181 | Kafka 协调服务 |
| nvidopia-mongodb | 27017 | MongoDB 7.0 |
| nvidopia-mongo-express | 8081 | MongoDB Web 管理界面 |
| nvidopia-bff-gateway | 3000 | API 网关 |
| nvidopia-release-manager | 3001 | 发布管理微服务 |
| nvidopia-fleet-manager | 3002 | 车队调度微服务 |
| nvidopia-issue-workflow | 3003 | Issue 工作流微服务 |
| nvidopia-traceability | 3004 | 追溯查询微服务 |
| nvidopia-kpi-engine | 3005 | KPI 引擎微服务 |
| nvidopia-frontend | 5173 | 前端 SPA（Nginx 托管） |

---

## 环境变量

所有变量定义在 `infra/.env.example`，复制到项目根目录 `.env` 即可。

| 变量 | 默认值 | 用途 |
|------|--------|------|
| `MONGO_URI` | `mongodb://nvidopia:nvidopia_dev@localhost:27017/nvidopia?authSource=admin` | 所有微服务 |
| `MONGO_DB_NAME` | `nvidopia` | 所有微服务 |
| `KAFKA_BROKERS` | `localhost:9092` | 网关、Fleet Manager、Issue Workflow、KPI Engine |
| `GATEWAY_PORT` | `3000` | BFF 网关 |
| `JWT_SECRET` | `change-me-in-production` | BFF 网关（JWT 签名密钥） |
| `RELEASE_MANAGER_PORT` | `3001` | 发布管理服务 |
| `FLEET_MANAGER_PORT` | `3002` | 车队调度服务 |
| `ISSUE_WORKFLOW_PORT` | `3003` | Issue 工作流服务 |
| `TRACEABILITY_PORT` | `3004` | 追溯服务 |
| `KPI_ENGINE_PORT` | `3005` | KPI 引擎 |
| `VITE_API_BASE_URL` | `http://localhost:3000/api` | 前端 |
| `LOG_LEVEL` | `debug` | 所有服务（日志级别） |

---

## 核心数据模型

系统围绕四个核心领域实体构建严格的父子层级：

```
Project（测试项目）
  └── Task（测试任务：Daily / Smoke / Gray / Freeze / Retest）
        └── Run（测试过程：一辆车 + 一个时间窗口）
              └── Issue（测试问题：缺陷/接管事件）
```

---

## Issue 状态机

```
New → Triage → Assigned → InProgress → Fixed → RegressionTracking → Closed
                  ↓                                      ↓
               Rejected                               Reopened → InProgress
```

每次状态变更都会写入 `issue_state_transitions` 审计日志。

---

## Kafka 消息管道

| Topic | 分区键 | 保留策略 | 用途 |
|-------|--------|----------|------|
| `ad.telemetry.mileage.realtime` | vehicle_id | 7 天 | 车辆实时遥测（GPS、速度、里程增量） |
| `ad.vehicle.status.tracking` | vehicle_id | 日志压缩 | 车辆心跳、软硬件版本、电量、驾驶模式 |
| `ad.testing.issue.reports` | run_id | 30 天 | 缺陷上报（包含传感器快照 URI） |
| `ad.testing.kpi.metrics` | project_id | 7 天 | 预聚合 KPI 指标 |
| `*.dlq` | 原始键 | 30 天 | 死信队列（重试 3 次后进入） |

---

## 预留扩展点

| 能力 | 当前状态 | 扩展方式 |
|------|----------|----------|
| 自动 Triage | 桩接口（返回 501） | 对接规则引擎或 ML 分类模型 |
| 仿真测试 | 预留字段 `simulation_ref` / `simulation_status` | 对接仿真执行器，写回结果至 Kafka 管道 |

---

## 停止与清理

```bash
# 停止基础设施容器
docker compose -f infra/docker-compose.yml down

# 停止全栈容器
docker compose -f infra/docker-compose.full.yml down

# 清除 MongoDB 数据卷（会删除所有数据）
docker compose -f infra/docker-compose.yml down -v
```

---

## 相关文档

| 文档 | 说明 |
|------|------|
| [`docs/architecture.md`](docs/architecture.md) | 系统架构、数据模型、状态机、Kafka Topic、API 总览 |
| [`docs/dev-guide.md`](docs/dev-guide.md) | 本地开发指南、项目结构、添加新服务、提交规范 |
| [`TESTME_zh.md`](TESTME_zh.md) | 本地测试指南 |

---

## 许可证

TBD
