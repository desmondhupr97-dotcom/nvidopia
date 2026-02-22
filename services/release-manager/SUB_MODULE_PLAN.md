# SUB_MODULE_PLAN: services/release-manager

## 模块目标与边界

管理 Project 与 Task 的完整生命周期，实现多级发布关卡（Smoke -> Gray -> Freeze -> Retest）流转逻辑，驱动自动驾驶软件版本从代码合并到准许发布的全流程。

**边界**：
- 负责：Project CRUD、Task CRUD、发布关卡状态机、版本冻结控制、Task 自动触发（如冒烟测试）。
- 不负责：车辆调度（fleet-manager）、Issue 流转（issue-workflow）、KPI 计算。

## 功能拆解（需求项）

| ID | 功能 | 优先级 | 状态 |
|----|------|--------|------|
| RM-01 | Project CRUD（创建、查询、更新、归档） | P0 | Not Started |
| RM-02 | Task CRUD（创建、查询、更新、关闭） | P0 | Not Started |
| RM-03 | Task 类型管理（Daily/Smoke/Gray/Freeze/Retest） | P0 | Not Started |
| RM-04 | 发布关卡状态机（Smoke通过->Gray->Freeze->Go-Live） | P0 | Not Started |
| RM-05 | 版本冻结控制（Freeze 期间禁止新特性合入标记） | P1 | Not Started |
| RM-06 | Retest Task 自动关联 Fixed Issue 列表 | P1 | Not Started |

## 数据与接口契约

- REST API：`contracts/openapi/release-manager.yaml`
- MongoDB 集合：`projects`、`tasks`
- 事件发布：Task 状态变更事件（供 fleet-manager 消费）

## 开发任务清单

| 任务 | 状态 |
|------|------|
| 初始化 Node.js 微服务项目 | Not Started |
| 实现 Project 数据模型与 CRUD API | Not Started |
| 实现 Task 数据模型与 CRUD API | Not Started |
| 实现发布关卡状态机 | Not Started |
| 实现 Task 状态变更事件发布 | Not Started |
| 实现 Retest Task 关联 Fixed Issue | Not Started |

## 测试策略与验收标准

- 单元测试：状态机流转规则、关卡前置条件校验。
- 集成测试：Project->Task 级联操作、事件发布。
- 验收标准：
  - 可完成 Project 创建到 Task 派发的完整流程。
  - 发布关卡按 Smoke->Gray->Freeze 顺序正确流转。
  - Freeze 阶段 Task 不允许标记为新特性类型。

## 风险与依赖

- 依赖 `platform/data-models` 的 MongoDB schema。
- 发布关卡流转需要 `services/issue-workflow` 提供 Issue 统计（是否存在 Blocker）。

## 变更记录

| 日期 | 责任人 | 变更内容 | 关联 Commit |
|------|--------|----------|-------------|
| 2026-02-22 | System | 初始化子模块计划 | - |
