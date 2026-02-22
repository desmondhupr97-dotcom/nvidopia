# SUB_MODULE_PLAN: contracts

## 模块目标与边界

API 与事件契约统一管理。集中存放所有 OpenAPI（REST）与 AsyncAPI（Kafka 事件）定义，作为前后端、服务间通信的唯一真实来源（Single Source of Truth），并驱动 typed client 代码生成。

**边界**：
- 负责：OpenAPI spec 定义、AsyncAPI spec 定义、Dashboard JSON schema 定义、代码生成脚本。
- 不负责：实现逻辑。

## 功能拆解（需求项）

| ID | 功能 | 优先级 | 状态 |
|----|------|--------|------|
| CT-01 | Gateway OpenAPI spec | P0 | Not Started |
| CT-02 | Release Manager OpenAPI spec | P0 | Not Started |
| CT-03 | Fleet Manager OpenAPI spec | P0 | Not Started |
| CT-04 | Issue Workflow OpenAPI spec | P0 | Not Started |
| CT-05 | Traceability OpenAPI spec | P0 | Not Started |
| CT-06 | KPI Engine OpenAPI spec | P0 | Not Started |
| CT-07 | AsyncAPI 事件契约（4 大 Topic） | P0 | Not Started |
| CT-08 | Dashboard JSON Schema | P0 | Not Started |
| CT-09 | Typed client 代码生成脚本 | P1 | Not Started |

## 数据与接口契约

- 目录结构：
  - `openapi/` - 各微服务 REST API spec
  - `asyncapi/` - Kafka 事件 spec
  - `schemas/` - Dashboard JSON Schema 等共享 schema
  - `generated/` - 代码生成输出（gitignored）

## 开发任务清单

| 任务 | 状态 |
|------|------|
| 创建 contracts 目录结构 | Not Started |
| 编写 Gateway OpenAPI spec | Not Started |
| 编写各微服务 OpenAPI spec | Not Started |
| 编写 AsyncAPI 事件契约 | Not Started |
| 编写 Dashboard JSON Schema | Not Started |
| 配置代码生成脚本（openapi-generator） | Not Started |

## 测试策略与验收标准

- Lint：OpenAPI/AsyncAPI spec 通过 spectral 校验。
- 验收标准：
  - 所有微服务 API 有对应 OpenAPI spec。
  - 4 大 Kafka Topic 有 AsyncAPI 定义。
  - `npm run generate` 可生成 typed client。

## 风险与依赖

- 契约变更需要同步通知前后端所有模块。
- 作为所有模块的上游依赖，需优先稳定。

## 变更记录

| 日期 | 责任人 | 变更内容 | 关联 Commit |
|------|--------|----------|-------------|
| 2026-02-22 | System | 初始化子模块计划 | - |
