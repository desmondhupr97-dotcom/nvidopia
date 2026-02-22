# SUB_MODULE_PLAN: platform/eventing

## 模块目标与边界

Kafka 事件平台层。定义所有 Topic 命名规范、分区策略、保留策略，提供消费者基类/工具库（含重试、幂等、DLQ），以及流计算作业（KPI 聚合）的配置与定义。

**边界**：
- 负责：Topic 定义与配置、Kafka consumer/producer 工具库、DLQ 规范、KPI 流聚合作业定义。
- 不负责：具体业务逻辑处理（由各微服务实现）、数据库操作。

## 功能拆解（需求项）

| ID | 功能 | 优先级 | 状态 |
|----|------|--------|------|
| EV-01 | Topic 定义文件（4 大 topic + DLQ topic） | P0 | Not Started |
| EV-02 | Kafka producer 工具库（序列化、分区键、重试） | P0 | Not Started |
| EV-03 | Kafka consumer 基类（反序列化、幂等键、DLQ 路由、重试策略） | P0 | Not Started |
| EV-04 | KPI 流聚合作业配置（窗口函数、输入输出 topic） | P1 | Not Started |
| EV-05 | Topic 自动创建脚本（开发环境） | P1 | Not Started |

## 数据与接口契约

- Topic 命名规范：`<数据大类>.<子领域>.<业务>.<特征>`
- 核心 Topics：
  - `ad.telemetry.mileage.realtime`（Partition Key: vehicle_id, 7d retention）
  - `ad.vehicle.status.tracking`（Partition Key: vehicle_id, Log Compaction）
  - `ad.testing.issue.reports`（30d retention）
  - `ad.testing.kpi.metrics`（聚合输出）
- AsyncAPI 契约：`contracts/asyncapi/events.yaml`

## 开发任务清单

| 任务 | 状态 |
|------|------|
| 编写 Topic 定义 JSON/YAML | Not Started |
| 实现 Kafka producer 工具库 | Not Started |
| 实现 Kafka consumer 基类（含 DLQ） | Not Started |
| 编写 Topic 自动创建脚本 | Not Started |
| 定义 KPI 聚合作业配置 | Not Started |

## 测试策略与验收标准

- 单元测试：序列化/反序列化、分区键计算、重试逻辑。
- 集成测试：produce -> consume -> DLQ 完整链路。
- 验收标准：
  - 4 个核心 Topic 可在本地 Kafka 中自动创建。
  - Consumer 消费失败后重试 3 次后进入 DLQ。
  - Producer 幂等性保证（相同 idempotency key 不重复写入）。

## 风险与依赖

- 依赖 `infra/` 提供的 Kafka 容器环境。
- 所有微服务均依赖本模块的工具库。

## 变更记录

| 日期 | 责任人 | 变更内容 | 关联 Commit |
|------|--------|----------|-------------|
| 2026-02-22 | System | 初始化子模块计划 | - |
