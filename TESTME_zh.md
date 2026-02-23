# TESTME - 测试指南

本文档指导你如何验证 Nvidopia 各模块功能的正确性，覆盖本地开发、Docker 全栈和 Cloud Run 三种部署方式。

---

## 前置条件

| 工具 | 版本要求 | 检查命令 |
|------|----------|----------|
| Node.js | >= 20 | `node -v` |
| Docker + Compose V2 | >= 24 | `docker compose version` |
| curl | 任意 | `curl --version` |
| gcloud（仅 Cloud Run） | latest | `gcloud version` |

---

## 第一步：启动服务

根据你的部署方式，选择以下任一方式启动。

### 方式 A：Docker 全栈一键启动

```bash
git clone https://github.com/desmondhupr97-dotcom/nvidopia.git
cd nvidopia
docker compose -f infra/docker-compose.full.yml up --build
```

等待所有容器启动完成后（约 1-2 分钟），即可跳到**第三步**开始导入种子数据和测试。

停止全栈：

```bash
docker compose -f infra/docker-compose.full.yml down
```

### 方式 B：仅启动基础设施（本地开发模式）

```bash
docker compose -f infra/docker-compose.yml up -d
```

验证基础设施是否就绪：

```bash
# 检查 MongoDB
docker exec nvidopia-mongodb mongosh --eval "db.runCommand({ ping: 1 })" \
  -u nvidopia -p nvidopia_dev --authenticationDatabase admin

# 检查 Kafka
docker exec nvidopia-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

### 方式 C：Google Cloud Run 一键上云

```bash
# 登录并设置项目
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud config set run/region us-central1

# 部署（需要提前准备 MongoDB Atlas 连接字符串）
gcloud run deploy nvitopia \
  --source . \
  --set-env-vars="MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/nvidopia" \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=2 \
  --timeout=300
```

部署成功后 `gcloud` 会输出服务 URL（如 `https://nvitopia-xxx-uc.a.run.app`）。后续测试中将 `http://localhost:5173` / `http://localhost:3000` 替换为该 URL 即可。

> **注意：** Cloud Run 部署不含 Kafka，`/api/ingest/*` 端点不可用。其他所有 CRUD 和查询功能正常工作。

---

## 第二步：安装依赖并启动服务（仅方式 B 需要）

> 如果你使用了方式 A（Docker 全栈）或方式 C（Cloud Run），跳过此步。

```bash
npm install
cp infra/.env.example .env

npm run build -w platform/data-models
npm run build -w platform/eventing
npm run build -w platform/observability

# 在不同终端窗口中启动
npm run dev -w apps/bff-gateway        # 终端 1 — 网关 :3000
npm run dev -w services/release-manager # 终端 2 — 发布管理 :3001
npm run dev -w services/fleet-manager   # 终端 3 — 车队调度 :3002
npm run dev -w services/issue-workflow  # 终端 4 — Issue工作流 :3003
npm run dev -w services/traceability    # 终端 5 — 追溯 :3004
npm run dev -w services/kpi-engine      # 终端 6 — KPI :3005
npm run dev -w services/fleet-simulator # 终端 7 — 车队模拟器 :3006
npm run dev -w apps/frontend            # 终端 8 — 前端 :5173
```

---

## 第三步：导入测试种子数据

> 方式 A 用户需在**另一个终端窗口**执行此命令（容器保持运行）。
> 方式 C 用户需使用 Atlas 连接字符串。

```bash
# 本地 / Docker 模式
npx tsx platform/data-models/src/seed.ts

# Cloud Run / Atlas 模式
MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/nvidopia" npx tsx platform/data-models/src/seed.ts
```

成功后会输出插入的实体数量：2 个项目、6 个任务、10 次 Run、20 个 Issue 等。

---

## 第四步：服务健康检查

```bash
# 本地模式
curl http://localhost:3000/health    # 网关
curl http://localhost:3001/health    # 发布管理
curl http://localhost:3002/health    # 车队调度
curl http://localhost:3003/health    # Issue 工作流
curl http://localhost:3004/health    # 追溯服务
curl http://localhost:3005/health    # KPI 引擎
curl http://localhost:3006/health    # 车队模拟器

# Cloud Run 模式
curl https://YOUR-SERVICE-URL/health
```

每个端点应返回类似 `{"status":"ok","service":"xxx"}` 的 JSON。

---

## 第五步：运行 E2E 冒烟测试脚本

```bash
bash scripts/e2e-smoke.sh
```

> E2E 脚本仅支持本地 / Docker 模式（依赖 localhost 端口）。

### 脚本测试的 10 个步骤

| 步骤 | 验证内容 |
|------|----------|
| 1 | 所有 6 个服务的健康检查 |
| 2 | 创建 Project（发布管理服务） |
| 3 | 创建 Smoke Task（发布管理服务） |
| 4 | 通过 ingest 端点注册车辆（网关 -> Kafka -> 车队调度） |
| 5 | 创建 Run（车队调度服务） |
| 6 | 模拟 Issue 上报（网关 -> Kafka） |
| 7 | 直接创建 Issue 并验证持久化（Issue 工作流服务） |
| 8 | Issue 完整状态机流转：New -> Triage -> Assigned -> InProgress -> Fixed -> RegressionTracking -> Closed |
| 9 | 查询 KPI 端点（MPI、MTTR、车队利用率、缺陷收敛） |
| 10 | 查询追溯端点（覆盖率、反向追溯） |

脚本会输出每步 PASS/FAIL 结果和最终汇总。

---

## 第六步：手动 API 测试

以下 curl 示例在 macOS / Linux / Git Bash 中可直接使用。Cloud Run 用户将 `localhost:PORT` 替换为服务 URL。

### 6.1 创建 Project

```bash
curl -X POST http://localhost:3001/projects \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "TEST-001",
    "name": "V2.0 城市领航测试",
    "vehicle_platform": "ORIN-X",
    "soc_architecture": "dual-orin-x",
    "sensor_suite_version": "SS-4.2",
    "software_baseline_version": "v2.0.0-rc1",
    "target_mileage_km": 5000,
    "start_date": "2026-03-01T00:00:00Z",
    "status": "Active"
  }'
```

### 6.2 创建 Task

```bash
curl -X POST http://localhost:3001/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "TASK-001",
    "project_id": "TEST-001",
    "name": "冒烟测试任务",
    "task_type": "Smoke",
    "priority": "High",
    "target_vehicle_count": 3,
    "status": "Pending"
  }'
```

### 6.3 通过网关 Ingest 端点上报车辆状态

> 仅限本地 / Docker 模式（需要 Kafka）

```bash
curl -X POST http://localhost:3000/api/ingest/status \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "VIN-TEST-001",
    "timestamp": "2026-03-01T08:00:00Z",
    "status": "Online",
    "software_version": "v2.0.0-rc1",
    "hardware_version": "HW-3.1",
    "fuel_or_battery_level": 90,
    "driving_mode": "Standby",
    "lat": 31.2304,
    "lng": 121.4737
  }'
```

### 6.4 创建 Run

```bash
curl -X POST http://localhost:3002/runs \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "RUN-001",
    "task_id": "TASK-001",
    "vehicle_vin": "VIN-TEST-001",
    "driver_id": "driver-zhang",
    "start_time": "2026-03-01T09:00:00Z",
    "software_version_hash": "abc123",
    "status": "Active"
  }'
```

### 6.5 创建 Issue

```bash
curl -X POST http://localhost:3003/issues \
  -H "Content-Type: application/json" \
  -d '{
    "issue_id": "ISS-001",
    "run_id": "RUN-001",
    "trigger_timestamp": "2026-03-01T09:15:00Z",
    "gps_coordinates": {"lat": 31.2345, "lng": 121.4789},
    "category": "Perception",
    "severity": "High",
    "takeover_type": "SystemFault",
    "description": "感知模块在十字路口漏检行人",
    "status": "New"
  }'
```

### 6.6 Issue 状态机流转

```bash
# New -> Triage
curl -X PUT http://localhost:3003/issues/ISS-001/transition \
  -H "Content-Type: application/json" \
  -d '{"to_status": "Triage", "triggered_by": "system", "reason": "自动进入分诊"}'

# Triage -> Assigned（人工分诊）
curl -X POST http://localhost:3003/issues/ISS-001/triage \
  -H "Content-Type: application/json" \
  -d '{"assigned_to": "wang@nvidopia.dev", "assigned_module": "Perception", "triggered_by": "test-manager"}'

# Assigned -> InProgress
curl -X PUT http://localhost:3003/issues/ISS-001/transition \
  -H "Content-Type: application/json" \
  -d '{"to_status": "InProgress", "triggered_by": "wang@nvidopia.dev", "reason": "开始排查"}'

# InProgress -> Fixed
curl -X PUT http://localhost:3003/issues/ISS-001/transition \
  -H "Content-Type: application/json" \
  -d '{"to_status": "Fixed", "triggered_by": "wang@nvidopia.dev", "reason": "PR #42 已合入主干"}'

# Fixed -> RegressionTracking
curl -X PUT http://localhost:3003/issues/ISS-001/transition \
  -H "Content-Type: application/json" \
  -d '{"to_status": "RegressionTracking", "triggered_by": "ci-system", "reason": "新版本已部署到测试车队"}'

# RegressionTracking -> Closed
curl -X PUT http://localhost:3003/issues/ISS-001/transition \
  -H "Content-Type: application/json" \
  -d '{"to_status": "Closed", "triggered_by": "qa-li", "reason": "复测通过，问题未复现"}'
```

### 6.7 查看 Issue 审计轨迹

```bash
curl http://localhost:3003/issues/ISS-001/transitions
```

### 6.8 查询 KPI

```bash
curl "http://localhost:3005/kpi/mpi?project_id=TEST-001"
curl "http://localhost:3005/kpi/mttr?project_id=TEST-001"
curl "http://localhost:3005/kpi/regression-pass-rate?project_id=TEST-001"
curl "http://localhost:3005/kpi/fleet-utilization?project_id=TEST-001"
curl "http://localhost:3005/kpi/issue-convergence?project_id=TEST-001"
```

### 6.9 追溯查询

```bash
curl http://localhost:3004/trace/backward/ISS-001
curl http://localhost:3004/trace/forward/REQ-001
curl http://localhost:3004/trace/impact/ISS-001
curl http://localhost:3004/trace/coverage
```

---

## 第七步：前端界面验证

启动前端后访问 http://localhost:5173（Cloud Run 用服务 URL），逐页验证：

| 页面 | URL | 验证要点 |
|------|-----|----------|
| 项目管理 | `/projects` | 可看到种子数据中的项目列表 |
| 项目详情 | `/projects/:id` | 可看到项目下的任务列表 |
| 任务管理 | `/tasks` | 任务列表、类型标签颜色正确 |
| 任务详情 | `/tasks/:id` | 可推进发布关卡、可分配车辆 |
| 测试过程 | `/runs` | Run 列表、状态指示灯 |
| Issue 列表 | `/issues` | 严重度/状态标签颜色正确 |
| Issue 详情 | `/issues/:id` | 状态机流转按钮、审计轨迹 |
| KPI 看板 | `/kpi` | MPI/MTTR/通过率/利用率/收敛趋势图 + 自定义 KPI |
| 追溯分析 | `/traceability` | 正反向追溯链路可视化 |
| 车队模拟 | `/simulation` | 模拟会话列表、创建向导（车队/路线/分配） |
| 模拟详情 | `/simulation/:id` | 实时统计、路线地图、控制按钮 |
| Auto-Triage | `/auto-triage` | 显示 "Coming Soon" 占位 |

---

## 常见问题

### Kafka 连接失败

确认 Kafka 容器已完全启动（通常需要 10-15 秒）：

```bash
docker logs nvidopia-kafka --tail 20
```

### MongoDB 认证失败

检查 `.env` 中的 `MONGO_URI` 是否包含 `?authSource=admin`：

```
MONGO_URI=mongodb://nvidopia:nvidopia_dev@localhost:27017/nvidopia?authSource=admin
```

### Cloud Run 部署后 Container failed to start

确认 `MONGO_URI` 环境变量已正确设置。Cloud Run 容器启动时需要连接 MongoDB，如连接失败服务会退出。在 Cloud Run 控制台 → Logs 查看详细错误信息。

### Cloud Run 数据接入端点返回 500

Cloud Run 部署不含 Kafka。`/api/ingest/telemetry`、`/api/ingest/status`、`/api/ingest/issue` 需要 Kafka 才能工作。请直接使用各微服务的 REST API 进行 CRUD 操作。

### 端口冲突

如果本地端口被占用，可通过 `.env` 修改各服务端口号，然后重启对应服务。

### 前端无法连接后端

- **本地模式**：确认网关服务（端口 3000）正在运行，前端的 Vite 代理将 `/api` 请求转发至网关。
- **Cloud Run**：Nginx 自动将 `/api` 代理到内部网关，无需额外配置。

---

## 停止所有服务

```bash
# 停止基础设施容器
docker compose -f infra/docker-compose.yml down

# 停止全栈容器
docker compose -f infra/docker-compose.full.yml down

# 清除 MongoDB 数据卷（会删除所有数据）
docker compose -f infra/docker-compose.yml down -v

# 删除 Cloud Run 服务
gcloud run services delete nvitopia
```
