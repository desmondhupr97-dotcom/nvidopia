# SUB_MODULE_PLAN: services/issue-workflow

## 模块目标与边界

Issue 缺陷生命周期管理微服务。消费缺陷上报事件，维护严格的状态机流转（New -> Triage -> Assigned -> InProgress -> Fixed -> RegressionTracking -> Closed/Reopened/Rejected），记录审计轨迹，支持人工分诊。

**边界**：
- 负责：Issue 创建（从 Kafka 事件）、状态机流转与校验、人工分诊分配、状态变更审计日志。
- 不负责：自动分类/triage（本期预留接口）、KPI 计算、追溯图谱构建。
- 预留：`triage_mode`（manual/auto_reserved）、`triage_hint`、`triage_source` 字段，供自动 triage 扩展。

## 功能拆解（需求项）

| ID | 功能 | 优先级 | 状态 |
|----|------|--------|------|
| IW-01 | 消费 `ad.testing.issue.reports` 自动创建 Issue | P0 | Done |
| IW-02 | Issue 状态机引擎（严格前置条件校验） | P0 | Done |
| IW-03 | Issue CRUD API（查询、更新、批量） | P0 | Done |
| IW-04 | 人工分诊接口（Triage -> Assigned，指定责任人与模块） | P0 | Done |
| IW-05 | 状态变更审计日志（issue_state_transitions 集合） | P0 | Done |
| IW-06 | Issue 与 Code Commit 关联（fix_commit_id） | P1 | Done |
| IW-07 | Auto-Triage Adapter 接口预留（桩实现） | P2 | Done |
| IW-08 | 车辆动态快照上传/查询 API（VehicleDynamicsSnapshot） | P0 | Done |
| IW-09 | 时序数据批量上传/查询 API（IssueTimeSeries） | P0 | Done |

## 数据与接口契约

- Kafka 消费：`ad.testing.issue.reports`
- REST API：`contracts/openapi/issue-workflow.yaml`
- MongoDB 集合：`issues`、`issue_state_transitions`

## 开发任务清单

| 任务 | 状态 |
|------|------|
| 初始化 Node.js 微服务项目 | Done |
| 实现 Kafka consumer（Issue 事件） | Done |
| 实现 Issue 状态机引擎 | Done |
| 实现 Issue CRUD API | Done |
| 实现人工分诊流程 | Done |
| 实现审计日志记录 | Done |
| 实现 Commit 关联接口 | Done |
| 实现 Auto-Triage Adapter 桩 | Done |
| 实现车辆动态快照 CRUD API | Done |
| 实现时序数据批量上传/查询 API | Done |

## 测试策略与验收标准

- 单元测试：状态机所有合法/非法流转路径。
- 快照上传/查询测试：VehicleDynamicsSnapshot 上传、按 issue_id 查询、字段完整性验证。
- 时序数据测试：IssueTimeSeries 批量写入、按 channel/时间范围查询、多变量筛选。
- 集成测试：Kafka 消费创建 Issue 端到端、分诊流程。
- 验收标准：
  - Kafka 上报事件可自动创建 Issue（状态为 New）。
  - Issue 可按状态机完整流转，非法流转被拒绝。
  - 每次状态变更写入审计日志。
  - Auto-Triage 桩接口返回 501 Not Implemented。
  - 车辆动态快照可上传并按 issue_id 查询。
  - 时序数据可批量写入并按 channel/时间范围查询。

## 风险与依赖

- 依赖 Kafka `ad.testing.issue.reports` topic。
- 状态机规则需与 PRD 第 5.3 节严格对齐。
- 与 `services/release-manager` 有交互（Retest Task 需查询 Fixed Issue）。

## 变更记录

| 日期 | 责任人 | 变更内容 | 关联 Commit |
|------|--------|----------|-------------|
| 2026-02-22 | System | 初始化子模块计划 | - |
| 2026-02-23 | System | 追加 IW-08~IW-09：车辆动态快照与时序数据上传/查询 API | - |
