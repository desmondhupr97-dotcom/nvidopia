# SUB_MODULE_PLAN: services/ptc-service

## 模块目标与边界

PTC（Project-Task-Car）绑定管理服务。管理 PTC 专属的 Project/Task 生命周期及 Binding 关系，提供 Build/Car/Tag/Drive 爬取数据的查询接口与 Binding 总览聚合。

**注意**：PTC 的 Project/Task 与 release-manager 中的 Project/Task 是**不同概念**，独立集合存储（ptc_ 前缀），互不干扰。

**边界**：
- 负责：PTC Project CRUD、PTC Task CRUD（含从属关系管理）、Binding CRUD（含 Draft/Published 状态机）、Drive 筛选与绑定/取消绑定（含理由）、Build/Car/Tag/Drive 爬取数据查询（先 mock）、Binding 总览聚合（渐进式加载）。
- 不负责：Alfred/Kratos 数据爬取（M6 后续迭代）、KPI 计算（由 kpi-engine 负责，本服务仅提供 Published Binding 数据接口）。

## 功能拆解（需求项）

| ID | 功能 | 优先级 | 状态 |
|----|------|--------|------|
| PTC-01 | PTC Project CRUD（创建、模糊搜索、更新、删除级联） | P0 | Done |
| PTC-02 | PTC Task CRUD（创建、模糊搜索、从属关系变更、删除级联） | P0 | Done |
| PTC-03 | PTC Binding CRUD（创建、查询、更新 car/drive、状态变更 Draft/Published、删除） | P0 | Done |
| PTC-04 | Drive 筛选与绑定管理（复合条件筛选、drive 勾选/取消勾选、保存理由） | P0 | Done |
| PTC-05 | 爬取数据只读查询（Build/Car/Tag/Drive 列表 + 模糊搜索 + 筛选） | P0 | Done |
| PTC-06 | Binding 总览聚合（Project 维度摘要 + Task 维度详情，支持渐进式加载） | P0 | Done |
| PTC-07 | Mock 数据种子脚本（中等规模：5-10 Project、50-100 Task、20 Build、30 Car、10 Tag、500+ Drive） | P1 | Done |
| PTC-08 | 健康检查端点（/health） | P0 | Done |

## 数据与接口契约

- REST API 端点前缀：`/`（BFF 网关通过 `/api/ptc/*` 转发）
- MongoDB 集合：`ptc_projects`、`ptc_tasks`、`ptc_bindings`、`ptc_builds`、`ptc_cars`、`ptc_tags`、`ptc_drives`
- 状态机：Binding status `Draft` -> `Published`（可双向切换）
- Drive 取消勾选理由预设枚举：`数据异常`、`重复`、`不相关`、`设备故障`、`其他`

## 开发任务清单

| 任务 | 状态 |
|------|------|
| 初始化 Node.js 微服务项目（package.json, tsconfig, Express） | Done |
| 实现 PTC Project CRUD API | Done |
| 实现 PTC Task CRUD API（含从属关系逻辑） | Done |
| 实现 PTC Binding CRUD API（含状态机） | Done |
| 实现 Drive 筛选与绑定管理 API | Done |
| 实现 Build/Car/Tag/Drive 只读查询 API | Done |
| 实现 Binding 总览聚合 API（渐进式加载） | Done |
| 编写 Mock 数据种子脚本 | Done |
| 实现 /health 健康检查端点 | Done |

## 测试策略与验收标准

- 单元测试：Project/Task 从属关系逻辑、Binding 状态机流转。
- 集成测试：CRUD 端到端、Drive 筛选准确性、级联删除。
- 验收标准：
  - PTC Project/Task CRUD 正常工作，模糊搜索返回正确结果。
  - Binding 创建/编辑/删除正常，状态可在 Draft/Published 间切换。
  - Drive 筛选按 Build/Car/Tag 组合条件正确返回结果。
  - 取消勾选 drive 时理由正确保存且下次查询可见。
  - 总览聚合按 Project/Task 维度正确聚合（task 计数、car 数、日期范围、总里程）。
  - Mock 种子数据可一键导入。
  - /health 端点返回 200。

## 风险与依赖

- 依赖 `platform/data-models` 提供 PTC 数据模型。
- 依赖 `apps/bff-gateway` 配置 `/api/ptc/*` 代理路由。
- Alfred/Kratos 自动爬取为 M6 后续迭代，当前使用 mock 数据。
- Binding Published 状态的 KPI 计算接口需与 kpi-engine 协调。

## 变更记录

| 日期 | 责任人 | 变更内容 | 关联 Commit |
|------|--------|----------|-------------|
| 2026-02-27 | System | 初始化子模块计划（PTC-01 ~ PTC-08） | - |
