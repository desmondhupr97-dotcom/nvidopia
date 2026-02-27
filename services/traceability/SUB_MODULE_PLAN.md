# SUB_MODULE_PLAN: services/traceability

## 模块目标与边界

双向追溯图谱查询微服务。基于 MongoDB `$graphLookup` 聚合管道，提供正向追溯（需求 -> 代码 -> 版本 -> Project -> Task -> Run -> Issue）与反向追溯（Issue -> ... -> 需求）能力，满足 ASPICE / ISO 26262 合规要求。

**边界**：
- 负责：追溯链路查询 API、图谱数据关联维护、追溯报告生成。
- 不负责：数据写入（由各业务服务写入关联字段）、Issue 流转、KPI 计算。

## 功能拆解（需求项）

| ID | 功能 | 优先级 | 状态 |
|----|------|--------|------|
| TR-01 | 正向追溯 API（需求 -> 代码 -> 版本 -> Project -> Task -> Run -> 验证结果） | P0 | Done |
| TR-02 | 反向追溯 API（Issue -> Run -> Task -> Project -> Commit -> 需求） | P0 | Done |
| TR-03 | 影响范围扩散查询（Issue -> Commit -> 需求 -> 正向展开所有受影响 Task） | P1 | Done |
| TR-04 | 追溯覆盖率统计（需求验证覆盖率百分比） | P1 | Done |
| TR-05 | 追溯报告导出 API | P2 | Not Started |

## 数据与接口契约

- REST API：`contracts/openapi/traceability.yaml`
- MongoDB 集合（读取）：`requirements`、`commits`、`builds`、`projects`、`tasks`、`runs`、`issues`
- 核心查询算子：`$graphLookup`、`$lookup`、`$match`

## 开发任务清单

| 任务 | 状态 |
|------|------|
| 初始化 Node.js 微服务项目 | Done |
| 实现正向追溯聚合管道 | Done |
| 实现反向追溯聚合管道 | Done |
| 实现影响范围扩散查询 | Done |
| 实现覆盖率统计接口 | Done |
| 实现追溯报告导出 | Not Started |

## 测试策略与验收标准

- 单元测试：聚合管道构造逻辑。
- 集成测试：预置种子数据后执行正反向追溯。
- 验收标准：
  - 正向追溯可从 Requirement 一路查到 Run 验证结果。
  - 反向追溯可从 Issue 一路查到原始需求。
  - 查询响应时间 < 500ms（种子数据规模下）。

## 风险与依赖

- 强依赖各业务服务在写入数据时正确维护关联字段（parent_id、commit_id 等）。
- `$graphLookup` 深度递归需要合理的索引支持（`platform/data-models`）。

## 变更记录

| 日期 | 责任人 | 变更内容 | 关联 Commit |
|------|--------|----------|-------------|
| 2026-02-22 | System | 初始化子模块计划 | - |
