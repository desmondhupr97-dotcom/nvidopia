# SUB_MODULE_PLAN: services/kpi-engine

## 模块目标与边界

KPI 聚合消费与查询微服务。消费 Kafka 预聚合 KPI 流，结合 MongoDB 业务数据提供多维度指标查询，驱动 Dashboard-as-Code 前端看板实时刷新。

**边界**：
- 负责：消费 `ad.testing.kpi.metrics`、KPI 查询 API、指标缓存与聚合、告警阈值评估。
- 不负责：原始流计算（由 Kafka Streams/Flink 在 platform/eventing 中完成）、前端渲染。

## 功能拆解（需求项）

| ID | 功能 | 优先级 | 状态 |
|----|------|--------|------|
| KPI-01 | 消费 `ad.testing.kpi.metrics` 写入指标存储 | P0 | Not Started |
| KPI-02 | MPI（平均接管里程）查询 API（支持分层视图） | P0 | Not Started |
| KPI-03 | MTTR（平均修复时间）查询 API | P0 | Not Started |
| KPI-04 | 回归测试通过率查询 API | P0 | Not Started |
| KPI-05 | 车队测试时间利用率查询 API | P1 | Not Started |
| KPI-06 | 缺陷收敛趋势查询 API（时序数据） | P0 | Not Started |
| KPI-07 | 告警阈值评估与通知 | P2 | Not Started |

## 数据与接口契约

- Kafka 消费：`ad.testing.kpi.metrics`
- REST API：`contracts/openapi/kpi-engine.yaml`
- MongoDB 集合（读取）：`issues`、`runs`、`tasks`
- MongoDB 集合（写入）：`kpi_snapshots`

## 开发任务清单

| 任务 | 状态 |
|------|------|
| 初始化 Node.js 微服务项目 | Not Started |
| 实现 Kafka consumer（KPI 指标流） | Not Started |
| 实现 MPI 查询 API | Not Started |
| 实现 MTTR 查询 API | Not Started |
| 实现回归通过率查询 API | Not Started |
| 实现利用率查询 API | Not Started |
| 实现收敛趋势时序 API | Not Started |
| 实现告警阈值评估 | Not Started |

## 测试策略与验收标准

- 单元测试：指标聚合逻辑、阈值评估。
- 集成测试：Kafka 消费写入、API 端到端。
- 验收标准：
  - KPI 指标流消费后可通过 API 查询。
  - MPI/MTTR/通过率/利用率/收敛趋势 5 类指标均可按版本/任务类型筛选。
  - 查询延迟 < 200ms。

## 风险与依赖

- 依赖 `platform/eventing` 中的流计算产出 KPI 聚合事件。
- 指标查询粒度需与前端 Dashboard JSON schema 对齐。

## 变更记录

| 日期 | 责任人 | 变更内容 | 关联 Commit |
|------|--------|----------|-------------|
| 2026-02-22 | System | 初始化子模块计划 | - |
