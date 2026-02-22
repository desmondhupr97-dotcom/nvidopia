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

## 测试策略与验收标准

- 单元测试：Schema 验证规则、聚合管道输出。
- 验收标准：
  - 所有集合 Schema 通过 Mongoose 验证。
  - 索引在 MongoDB 中可正确创建。
  - 种子数据可一键导入。

## 风险与依赖

- 所有微服务依赖本模块提供数据模型。
- Schema 变更需要通知所有下游服务。

## 变更记录

| 日期 | 责任人 | 变更内容 | 关联 Commit |
|------|--------|----------|-------------|
| 2026-02-22 | System | 初始化子模块计划 | - |
