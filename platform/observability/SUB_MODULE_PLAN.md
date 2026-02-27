# SUB_MODULE_PLAN: platform/observability

## 模块目标与边界

可观测性平台层。提供统一的结构化日志、分布式追踪（OpenTelemetry）、指标采集（Prometheus）与告警配置，供所有微服务集成。

**边界**：
- 负责：日志格式规范与工具库、Trace-ID 传播中间件、Prometheus 指标暴露、Grafana 看板模板、告警规则。
- 不负责：业务逻辑、数据持久化。

## 功能拆解（需求项）

| ID | 功能 | 优先级 | 状态 |
|----|------|--------|------|
| OB-01 | 结构化 JSON 日志工具库（winston/pino 封装） | P0 | Done |
| OB-02 | OpenTelemetry Trace-ID 中间件 | P1 | Done |
| OB-03 | Prometheus 指标暴露中间件（HTTP 请求/Kafka 消费） | P1 | Done |
| OB-04 | Grafana Dashboard 模板（服务可用性、延迟、DLQ） | P2 | Not Started |
| OB-05 | 告警规则定义（Kafka 消费延迟、DLQ 堆积、错误率） | P2 | Not Started |

## 数据与接口契约

- 日志格式：`{ timestamp, level, service, traceId, message, ...context }`
- 指标端点：`GET /metrics`（Prometheus 格式）
- Trace 导出：OpenTelemetry -> Jaeger/Zipkin

## 开发任务清单

| 任务 | 状态 |
|------|------|
| 初始化 npm 包（共享可观测性库） | Done |
| 实现结构化日志工具 | Done |
| 实现 Trace-ID 中间件 | Done |
| 实现 Prometheus 指标中间件 | Done |
| 编写 Grafana Dashboard JSON | Not Started |
| 编写告警规则 | Not Started |

## 测试策略与验收标准

- 单元测试：日志格式输出、Trace-ID 注入。
- 验收标准：
  - 所有微服务日志为结构化 JSON 格式。
  - Trace-ID 在请求链路中正确传播。
  - `/metrics` 端点返回 Prometheus 格式。

## 风险与依赖

- 所有微服务依赖本模块。
- OpenTelemetry collector 需在 `infra/` 中部署。

## 变更记录

| 日期 | 责任人 | 变更内容 | 关联 Commit |
|------|--------|----------|-------------|
| 2026-02-22 | System | 初始化子模块计划 | - |
