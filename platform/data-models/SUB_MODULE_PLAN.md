# SUB_MODULE_PLAN: platform/data-models

## 模块目标与边界

MongoDB 数据模型层。集中定义所有业务集合的 Schema（Mongoose/JSON Schema）、索引策略、聚合管道模板，为各微服务提供统一的数据访问层。

**边界**：
- 负责：集合 Schema 定义、索引规划、聚合管道模板、数据迁移脚本、种子数据。
- 不负责：业务逻辑、API 路由。

## 功能拆解（需求项）

| ID | 功能 | 优先级 | 状态 |
|----|------|--------|------|
| DM-01 | Project 集合 Schema 与索引 | P0 | Not Started |
| DM-02 | Task 集合 Schema 与索引 | P0 | Not Started |
| DM-03 | Run 集合 Schema 与索引 | P0 | Not Started |
| DM-04 | Issue 集合 Schema 与索引（含预留字段 triage_mode/hint/source） | P0 | Not Started |
| DM-05 | issue_state_transitions 集合 Schema | P0 | Not Started |
| DM-06 | requirements 集合 Schema（外部同步） | P1 | Not Started |
| DM-07 | commits 集合 Schema | P1 | Not Started |
| DM-08 | builds 集合 Schema | P1 | Not Started |
| DM-09 | kpi_snapshots 集合 Schema | P1 | Not Started |
| DM-10 | vehicles 集合 Schema（实时状态缓存） | P1 | Not Started |
| DM-11 | 追溯用 $graphLookup 聚合管道模板 | P0 | Not Started |
| DM-12 | 开发环境种子数据脚本 | P1 | Not Started |
| DM-13 | 四模型 `strict: false` + `extra` 字段改造（Project/Task/Run/Issue） | P0 | Not Started |
| DM-14 | IVehicleDynamicsSnapshot 子 Schema 定义 | P0 | Not Started |
| DM-15 | IssueTimeSeries 集合 Schema 与索引 | P0 | Not Started |
| DM-16 | KpiDefinition 集合 Schema 与索引 | P0 | Not Started |
| DM-17 | PtcProject 集合 Schema 与索引（ptc_projects） | P0 | Done |
| DM-18 | PtcTask 集合 Schema 与索引（ptc_tasks，含 project_id 外键与唯一约束） | P0 | Done |
| DM-19 | PtcBinding 集合 Schema 与索引（ptc_bindings，含 task_id 唯一约束、嵌套 cars/drives 子文档） | P0 | Done |
| DM-20 | PtcBuild 集合 Schema（ptc_builds，Alfred/Kratos 爬取数据，先 mock） | P1 | Done |
| DM-21 | PtcCar 集合 Schema（ptc_cars，Alfred/Kratos 爬取数据，先 mock） | P1 | Done |
| DM-22 | PtcTag 集合 Schema（ptc_tags，测试标签/测试类型，先 mock） | P1 | Done |
| DM-23 | PtcDrive 集合 Schema 与索引（ptc_drives，复合索引 car_id+build_id+tag_id，先 mock） | P0 | Done |

## 数据与接口契约

- 每个 Schema 导出为 Mongoose Model + TypeScript 类型。
- 索引策略文档化在本目录 `indexes.md` 中。
- 聚合管道模板导出为可复用函数。

## 开发任务清单

| 任务 | 状态 |
|------|------|
| 初始化 npm 包（共享数据模型库） | Not Started |
| 定义所有核心集合 Schema | Not Started |
| 定义索引策略 | Not Started |
| 实现 $graphLookup 聚合管道模板 | Not Started |
| 编写种子数据脚本 | Not Started |
| 编写数据迁移框架 | Not Started |
| 改造 Project/Task/Run/Issue 四模型为 `strict: false` + `extra` 字段 | Not Started |
| 创建 IVehicleDynamicsSnapshot 子 Schema | Not Started |
| 创建 IssueTimeSeries 集合 Schema | Not Started |
| 创建 KpiDefinition 集合 Schema | Not Started |
| 更新索引策略（含新集合索引） | Not Started |
| 更新种子数据脚本（覆盖新集合） | Not Started |
| 创建 PtcProject 集合 Schema | Done |
| 创建 PtcTask 集合 Schema（含 project_id 引用与唯一约束） | Done |
| 创建 PtcBinding 集合 Schema（含嵌套 cars/drives 子文档与状态机） | Done |
| 创建 PtcBuild 集合 Schema | Done |
| 创建 PtcCar 集合 Schema | Done |
| 创建 PtcTag 集合 Schema | Done |
| 创建 PtcDrive 集合 Schema（含复合索引） | Done |
| 导出所有 PTC 模型至 index.ts | Done |

## 测试策略与验收标准

- 单元测试：Schema 验证规则、聚合管道输出。
- 字段容错验证：四模型 `strict: false` 模式下未知字段写入/读取兼容性测试。
- 新 Schema 验证测试：IVehicleDynamicsSnapshot、IssueTimeSeries、KpiDefinition 结构与约束验证。
- 验收标准：
  - 所有集合 Schema 通过 Mongoose 验证。
  - 索引在 MongoDB 中可正确创建。
  - 种子数据可一键导入。
  - 四模型 `extra` 字段可正确存储与读取任意附加数据。
  - IssueTimeSeries 与 KpiDefinition 索引可正确创建。

## 风险与依赖

- 所有微服务依赖本模块提供数据模型。
- Schema 变更需要通知所有下游服务。

## 变更记录

| 日期 | 责任人 | 变更内容 | 关联 Commit |
|------|--------|----------|-------------|
| 2026-02-22 | System | 初始化子模块计划 | - |
| 2026-02-23 | System | 追加 DM-13~DM-16：字段容错改造、动态快照子 Schema、时序与自定义 KPI 集合 | - |
| 2026-02-27 | System | 追加 DM-17~DM-23：PTC 数据模型（PtcProject/Task/Binding/Build/Car/Tag/Drive） | - |
