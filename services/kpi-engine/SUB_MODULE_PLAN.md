# SUB_MODULE_PLAN: services/kpi-engine

## 模块目标与边界

KPI 聚合消费与查询微服务。消费 Kafka 预聚合 KPI 流，结合 MongoDB 业务数据提供多维度指标查询，驱动 Dashboard-as-Code 前端看板实时刷新。

**边界**：
- 负责：消费 `ad.testing.kpi.metrics`、KPI 查询 API、指标缓存与聚合、告警阈值评估。
- 不负责：原始流计算（由 Kafka Streams/Flink 在 platform/eventing 中完成）、前端渲染。

## 功能拆解（需求项）

| ID | 功能 | 优先级 | 状态 |
|----|------|--------|------|
| KPI-01 | 消费 `ad.testing.kpi.metrics` 写入指标存储 | P0 | Done |
| KPI-02 | MPI（平均接管里程）查询 API（支持分层视图） | P0 | Done |
| KPI-03 | MTTR（平均修复时间）查询 API | P0 | Done |
| KPI-04 | 回归测试通过率查询 API | P0 | Done |
| KPI-05 | 车队测试时间利用率查询 API | P1 | Done |
| KPI-06 | 缺陷收敛趋势查询 API（时序数据） | P0 | Done |
| KPI-07 | 告警阈值评估与通知 | P2 | Not Started |
| KPI-08 | Schema 注册表自省 API（字段元数据查询） | P0 | Done |
| KPI-09 | KPI 定义 CRUD API（自定义指标管理） | P0 | Done |
| KPI-10 | math.js 公式引擎（表达式解析与求值） | P0 | Done |
| KPI-11 | 自定义 KPI 评估/预览端点 | P0 | Done |

## 数据与接口契约

- Kafka 消费：`ad.testing.kpi.metrics`
- REST API：`contracts/openapi/kpi-engine.yaml`
- MongoDB 集合（读取）：`issues`、`runs`、`tasks`
- MongoDB 集合（写入）：`kpi_snapshots`

## 开发任务清单

| 任务 | 状态 |
|------|------|
| 初始化 Node.js 微服务项目 | Done |
| 实现 Kafka consumer（KPI 指标流） | Done |
| 实现 MPI 查询 API | Done |
| 实现 MTTR 查询 API | Done |
| 实现回归通过率查询 API | Done |
| 实现利用率查询 API | Done |
| 实现收敛趋势时序 API | Done |
| 实现告警阈值评估 | Not Started |
| 实现 Schema 注册表自省 API | Done |
| 实现 math.js 公式引擎 | Done |
| 实现 KPI 定义 CRUD API | Done |
| 实现自定义 KPI 评估/预览端点 | Done |

## 测试策略与验收标准

- 单元测试：指标聚合逻辑、阈值评估。
- Schema 注册表测试：字段元数据返回完整性、集合自省准确性。
- 公式引擎单元测试：math.js 表达式解析、变量注入、异常公式处理。
- KPI 计算集成测试：自定义 KPI 定义 -> 公式求值 -> 结果返回端到端。
- 集成测试：Kafka 消费写入、API 端到端。
- 验收标准：
  - KPI 指标流消费后可通过 API 查询。
  - MPI/MTTR/通过率/利用率/收敛趋势 5 类指标均可按版本/任务类型筛选。
  - 查询延迟 < 200ms。
  - Schema 注册表可返回所有集合字段元数据。
  - 自定义 KPI 可通过 math.js 公式正确计算并返回结果。

## 风险与依赖

- 依赖 `platform/eventing` 中的流计算产出 KPI 聚合事件。
- 指标查询粒度需与前端 Dashboard JSON schema 对齐。

## 变更记录

| 日期 | 责任人 | 变更内容 | 关联 Commit |
|------|--------|----------|-------------|
| 2026-02-22 | System | 初始化子模块计划 | - |
| 2026-02-23 | System | 追加 KPI-08~KPI-11：Schema 注册表、KPI 定义 CRUD、math.js 公式引擎、自定义 KPI 端点 | - |
