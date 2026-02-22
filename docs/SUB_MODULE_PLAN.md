# SUB_MODULE_PLAN: docs

## 模块目标与边界

项目文档中心。集中管理架构文档、开发运行手册、验收文档与变更日志，为团队协作和新成员 onboarding 提供参考。

**边界**：
- 负责：架构设计文档、本地开发指南、API 使用手册、验收报告模板、变更日志。
- 不负责：代码实现、契约定义（在 contracts/ 中）。

## 功能拆解（需求项）

| ID | 功能 | 优先级 | 状态 |
|----|------|--------|------|
| DOC-01 | 系统架构设计文档 | P0 | Not Started |
| DOC-02 | 本地开发环境搭建指南 | P0 | Not Started |
| DOC-03 | API 使用手册（基于 OpenAPI 自动生成） | P1 | Not Started |
| DOC-04 | 验收报告模板 | P1 | Not Started |
| DOC-05 | 变更日志（CHANGELOG） | P1 | Not Started |
| DOC-06 | 更新架构文档 `docs/architecture.md`：新增字段容错、数据快照、自定义 KPI 章节 | P0 | Not Started |

## 开发任务清单

| 任务 | 状态 |
|------|------|
| 编写架构设计文档初版 | Not Started |
| 编写本地开发指南 | Not Started |
| 创建验收报告模板 | Not Started |
| 初始化 CHANGELOG | Not Started |
| 在 architecture.md 中补充字段容错（strict: false + extra）设计说明 | Not Started |
| 在 architecture.md 中补充数据快照（VehicleDynamicsSnapshot）架构说明 | Not Started |
| 在 architecture.md 中补充自定义 KPI（KpiDefinition + math.js 公式引擎）架构说明 | Not Started |

## 测试策略与验收标准

- 验收标准：
  - 新成员可通过文档在 30 分钟内搭建本地环境。
  - 架构文档覆盖所有微服务边界与数据流。

## 风险与依赖

- 需要与各模块同步更新。

## 变更记录

| 日期 | 责任人 | 变更内容 | 关联 Commit |
|------|--------|----------|-------------|
| 2026-02-22 | System | 初始化子模块计划 | - |
| 2026-02-23 | System | 追加 DOC-06：架构文档更新（字段容错、数据快照、自定义 KPI） | - |
