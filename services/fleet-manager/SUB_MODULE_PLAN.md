# SUB_MODULE_PLAN: services/fleet-manager

## 模块目标与边界

车队资源调度与任务匹配微服务。持续消费车辆状态心跳与遥测数据，维护实时可用车辆资源池，执行 Task 到具体车辆的智能匹配，生成 Run 实例并下发任务指令。

**边界**：
- 负责：车辆状态消费与资源池维护、Task-车辆匹配、Run 生命周期管理、里程聚合持久化。
- 不负责：Issue 流转、KPI 计算、发布关卡管理。
- 预留：`simulation_ref` / `simulation_status` 字段，供未来仿真模块扩展。

## 功能拆解（需求项）

| ID | 功能 | 优先级 | 状态 |
|----|------|--------|------|
| FM-01 | 消费 `ad.vehicle.status.tracking` 维护车辆资源池 | P0 | Not Started |
| FM-02 | 消费 `ad.telemetry.mileage.realtime` 聚合里程数据 | P0 | Not Started |
| FM-03 | Task-车辆智能匹配（按硬件约束过滤） | P0 | Not Started |
| FM-04 | Run 创建、状态流转、结束 | P0 | Not Started |
| FM-05 | 车辆查询 API（状态、位置、配置） | P1 | Not Started |
| FM-06 | Run 查询 API（按 Task/VIN/时间范围） | P1 | Not Started |
| FM-07 | Simulation Adapter 接口预留（桩实现） | P2 | Not Started |

## 数据与接口契约

- Kafka 消费：`ad.vehicle.status.tracking`（Log Compaction）、`ad.telemetry.mileage.realtime`
- REST API：`contracts/openapi/fleet-manager.yaml`
- MongoDB 集合：`runs`、`vehicles`（实时状态缓存）

## 开发任务清单

| 任务 | 状态 |
|------|------|
| 初始化 Node.js 微服务项目 | Not Started |
| 实现 Kafka consumer（状态 + 遥测） | Not Started |
| 实现车辆资源池内存模型与持久化 | Not Started |
| 实现 Task-车辆匹配引擎 | Not Started |
| 实现 Run CRUD API | Not Started |
| 实现里程聚合与批量持久化 | Not Started |
| 实现 Simulation Adapter 桩 | Not Started |

## 测试策略与验收标准

- 单元测试：匹配算法、状态聚合逻辑。
- 集成测试：Kafka 消费端到端、Run 创建流程。
- 验收标准：
  - 车辆心跳消息可被消费并反映在资源池。
  - Task 下发后可自动匹配车辆并生成 Run。
  - Run 生命周期（创建->执行中->结束）可完整流转。

## 风险与依赖

- 依赖 Kafka `ad.vehicle.status.tracking` 与 `ad.telemetry.mileage.realtime` topic 可用。
- 依赖 `services/release-manager` 提供 Task 信息。
- 车辆匹配需要 Project 硬件约束字段。

## 变更记录

| 日期 | 责任人 | 变更内容 | 关联 Commit |
|------|--------|----------|-------------|
| 2026-02-22 | System | 初始化子模块计划 | - |
