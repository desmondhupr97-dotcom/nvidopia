# TESTME - 本地测试指南

本文档指导你如何在本地环境下验证 Nvidopia 各模块功能的正确性。

---

## 前置条件

| 工具 | 版本要求 | 检查命令 |
|------|----------|----------|
| Node.js | >= 20 | `node -v` |
| Docker | >= 24 | `docker -v` |
| Docker Compose | >= 2.20 | `docker compose version` |
| curl | 任意 | `curl --version` |
| bash | 任意（Windows 可用 Git Bash） | `bash --version` |

---

## 第一步：启动基础设施

```bash
docker-compose -f infra/docker-compose.yml up -d
```

验证基础设施是否就绪：

```bash
# 检查 MongoDB
docker exec nvidopia-mongodb mongosh --eval "db.runCommand({ ping: 1 })" \
  -u nvidopia -p nvidopia_dev --authenticationDatabase admin

# 检查 Kafka
docker exec nvidopia-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

---

## 第二步：安装依赖并启动服务

```bash
# 安装所有依赖
npm install

# 复制环境变量
cp infra/.env.example .env

# 构建平台库
npm run build -w platform/data-models
npm run build -w platform/eventing
npm run build -w platform/observability

# 在不同终端中启动各服务
npm run dev -w apps/bff-gateway        # 终端 1
npm run dev -w services/release-manager # 终端 2
npm run dev -w services/fleet-manager   # 终端 3
npm run dev -w services/issue-workflow  # 终端 4
npm run dev -w services/traceability    # 终端 5
npm run dev -w services/kpi-engine      # 终端 6
npm run dev -w apps/frontend            # 终端 7
```

或者使用 Docker 全栈模式：

```bash
docker-compose -f infra/docker-compose.full.yml up --build
```

---

## 第三步：导入测试种子数据

```bash
npx tsx platform/data-models/src/seed.ts
```

成功后会输出插入的实体数量：2 个项目、6 个任务、10 次 Run、20 个 Issue 等。

---

## 第四步：服务健康检查

逐个检查所有微服务的健康状态：

```bash
# 网关
curl http://localhost:3000/health

# 发布管理
curl http://localhost:3001/health

# 车队调度
curl http://localhost:3002/health

# Issue 工作流
curl http://localhost:3003/health

# 追溯服务
curl http://localhost:3004/health

# KPI 引擎
curl http://localhost:3005/health
```

每个端点应返回类似 `{"status":"ok","service":"xxx"}` 的 JSON。

---

## 第五步：运行 E2E 冒烟测试脚本

项目提供了一个自动化 E2E 脚本，覆盖完整的业务链路：

```bash
bash scripts/e2e-smoke.sh
```

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

以下是关键业务流程的 curl 示例，你可以逐个执行来验证各服务。

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
# 平均接管里程
curl "http://localhost:3005/kpi/mpi?project_id=TEST-001"

# 平均修复时间
curl "http://localhost:3005/kpi/mttr?project_id=TEST-001"

# 回归测试通过率
curl "http://localhost:3005/kpi/regression-pass-rate?project_id=TEST-001"

# 车队利用率
curl "http://localhost:3005/kpi/fleet-utilization?project_id=TEST-001"

# 缺陷收敛趋势
curl "http://localhost:3005/kpi/issue-convergence?project_id=TEST-001"
```

### 6.9 追溯查询

```bash
# 反向追溯（Issue -> 需求）
curl http://localhost:3004/trace/backward/ISS-001

# 正向追溯（需求 -> 验证结果）
curl http://localhost:3004/trace/forward/REQ-001

# 影响范围扩散
curl http://localhost:3004/trace/impact/ISS-001

# 需求覆盖率
curl http://localhost:3004/trace/coverage
```

### 6.10 验证预留接口

```bash
# 自动 Triage（应返回 501）
curl -X POST http://localhost:3003/issues/ISS-001/auto-triage

# 自动 Triage 状态（应返回 enabled: false）
curl http://localhost:3003/auto-triage/status
```

---

## 第七步：前端界面验证

启动前端后访问 http://localhost:5173，逐页验证：

| 页面 | URL | 验证要点 |
|------|-----|----------|
| 项目管理 | `/projects` | 可看到种子数据中的项目列表 |
| 项目详情 | `/projects/:id` | 可看到项目下的任务列表 |
| 任务管理 | `/tasks` | 任务列表、类型标签颜色正确 |
| 任务详情 | `/tasks/:id` | 可推进发布关卡、可分配车辆 |
| 测试过程 | `/runs` | Run 列表、状态指示灯 |
| Issue 列表 | `/issues` | 严重度/状态标签颜色正确 |
| Issue 详情 | `/issues/:id` | 状态机流转按钮、审计轨迹 |
| KPI 看板 | `/kpi` | MPI/MTTR/通过率/利用率/收敛趋势图 |
| 追溯分析 | `/traceability` | 正反向追溯链路可视化 |
| Auto-Triage | `/auto-triage` | 显示"Coming Soon"占位 |
| Simulation | `/simulation` | 显示"Coming Soon"占位 |

---

## 常见问题

### Kafka 连接失败

确认 Kafka 容器已完全启动（通常需要 10-15 秒）：

```bash
docker logs nvidopia-kafka --tail 20
```

如果看到 `Kafka Server started`，说明已就绪。

### MongoDB 认证失败

检查 `.env` 中的 `MONGO_URI` 是否包含 `?authSource=admin`：

```
MONGO_URI=mongodb://nvidopia:nvidopia_dev@localhost:27017/nvidopia?authSource=admin
```

### 端口冲突

如果本地端口被占用，可通过 `.env` 修改各服务端口号，然后重启对应服务。

### 前端无法连接后端

确认网关服务（端口 3000）正在运行，前端的 Vite 代理配置会将 `/api` 请求转发至 `http://localhost:3000`。

---

## 停止所有服务

```bash
# 停止基础设施容器
docker-compose -f infra/docker-compose.yml down

# 或停止全栈容器
docker-compose -f infra/docker-compose.full.yml down

# 如需清除 MongoDB 数据卷
docker-compose -f infra/docker-compose.yml down -v
```
