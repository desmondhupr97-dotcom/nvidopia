# SUB_MODULE_PLAN: apps/bff-gateway

## 模块目标与边界

API 网关 / BFF（Backend-for-Frontend）层。统一接收前端请求与车端数据上报，负责鉴权、协议转换、请求路由、限流与请求追踪，并将数据分发至 Kafka 或转发至后端微服务。

**边界**：
- 负责：JWT 鉴权、请求路由、限流、Trace-ID 注入、协议适配（HTTP -> Kafka produce）、响应聚合。
- 不负责：业务逻辑处理、数据持久化。

## 功能拆解（需求项）

| ID | 功能 | 优先级 | 状态 |
|----|------|--------|------|
| GW-01 | JWT 鉴权与 RBAC 中间件 | P0 | Not Started |
| GW-02 | 请求路由至各微服务（反向代理/转发） | P0 | Not Started |
| GW-03 | 车端遥测数据接入 -> Kafka produce | P0 | Not Started |
| GW-04 | 车端状态心跳接入 -> Kafka produce | P0 | Not Started |
| GW-05 | Issue 事件上报接入 -> Kafka produce | P0 | Not Started |
| GW-06 | 请求限流与熔断 | P1 | Not Started |
| GW-07 | 统一错误码与结构化日志 | P0 | Not Started |
| GW-08 | Trace-ID 传播（OpenTelemetry） | P1 | Not Started |
| GW-09 | Schema 注册表代理路由（转发至 kpi-engine） | P0 | Not Started |
| GW-10 | Issue 快照/时序数据代理路由（转发至 issue-workflow） | P0 | Not Started |
| GW-11 | 自定义 KPI 代理路由（转发至 kpi-engine） | P0 | Not Started |
| GW-12 | PTC 代理路由（/api/ptc/* 转发至 ptc-service:3007） | P0 | Not Started |

## 数据与接口契约

- 入口契约：`contracts/openapi/gateway.yaml`
- Kafka produce 目标：`ad.telemetry.mileage.realtime`、`ad.vehicle.status.tracking`、`ad.testing.issue.reports`
- 转发目标：release-manager、fleet-manager、issue-workflow、traceability、kpi-engine、ptc-service

## 开发任务清单

| 任务 | 状态 |
|------|------|
| 初始化 Node.js/Express 或 Fastify 项目 | Not Started |
| 实现 JWT 鉴权中间件 | Not Started |
| 实现路由转发层 | Not Started |
| 实现 Kafka producer（车端数据接入） | Not Started |
| 实现限流与熔断中间件 | Not Started |
| 统一错误处理与日志 | Not Started |
| 集成 OpenTelemetry tracing | Not Started |
| 配置 Schema 注册表代理路由转发 | Not Started |
| 配置 Issue 快照/时序数据代理路由转发 | Not Started |
| 配置自定义 KPI 代理路由转发 | Not Started |
| 配置 PTC 代理路由转发（/api/ptc/* -> ptc-service:3007） | Not Started |

## 测试策略与验收标准

- 单元测试：中间件链、路由映射。
- 集成测试：Kafka produce 端到端、鉴权流程。
- 验收标准：
  - 前端请求可鉴权后正确路由至各微服务。
  - 车端数据可正确写入对应 Kafka topic。
  - 限流触发后返回 429 状态码。

## 风险与依赖

- 依赖 Kafka 集群可用（`infra/` docker-compose）。
- 依赖 `contracts/` 中的 API 定义。
- 各微服务健康检查端点需可用。

## 变更记录

| 日期 | 责任人 | 变更内容 | 关联 Commit |
|------|--------|----------|-------------|
| 2026-02-22 | System | 初始化子模块计划 | - |
| 2026-02-23 | System | 追加 GW-09~GW-11：Schema 注册表、快照/时序、自定义 KPI 代理路由 | - |
| 2026-02-27 | System | 追加 GW-12：PTC 代理路由 | - |
