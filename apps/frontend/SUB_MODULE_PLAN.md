# SUB_MODULE_PLAN: apps/frontend

## 模块目标与边界

前端单页应用（SPA），提供自动驾驶测试中台的全部用户交互界面。采用 React + TypeScript + Vite 技术栈，通过 typed API client 与后端 BFF Gateway 通信，不直接访问微服务或数据库。

**边界**：
- 负责：页面路由、组件渲染、Dashboard-as-Code JSON 解析与图表渲染、状态管理、用户交互。
- 不负责：业务逻辑计算、数据持久化、鉴权令牌签发（由 BFF Gateway 处理）。

## 功能拆解（需求项）

| ID | 功能 | 优先级 | 状态 |
|----|------|--------|------|
| FE-01 | 项目管理页（Project CRUD、里程碑视图） | P0 | Not Started |
| FE-02 | 任务管理页（Task 列表、类型筛选、状态流转） | P0 | Not Started |
| FE-03 | Run 监控页（实时车辆状态、里程累计、地图轨迹） | P0 | Not Started |
| FE-04 | Issue 工作台（人工分诊、状态机可视化、详情面板） | P0 | Not Started |
| FE-05 | KPI 看板（Dashboard-as-Code 渲染器、变量筛选、告警阈值） | P0 | Not Started |
| FE-06 | 追溯分析页（正反向追溯链路可视化） | P1 | Not Started |
| FE-07 | AutoTriage 占位页（规划中提示 + 接口桩） | P2 | Not Started |
| FE-08 | Simulation 占位页（规划中提示 + 数据结构桩） | P2 | Not Started |
| FE-09 | 全局导航、布局、主题、权限路由守卫 | P0 | Not Started |
| FE-10 | Issue 详情页车辆动态快照展示 | P0 | Not Started |
| FE-11 | Issue 详情页时序图表（多通道、多变量） | P0 | Not Started |
| FE-12 | 自定义 KPI 看板（定义构建器 + 多图表渲染器） | P0 | Not Started |
| FE-13 | Schema 字段自动同步选择器 | P1 | Not Started |

## 数据与接口契约

- 所有接口调用通过 `contracts/` 目录下 OpenAPI 生成的 typed client。
- WebSocket/SSE 用于 Run 实时监控与 KPI 推送。
- Dashboard JSON schema 定义见 `contracts/dashboard-schema.json`。

## 开发任务清单

| 任务 | 状态 |
|------|------|
| 初始化 Vite + React + TypeScript 项目 | Not Started |
| 搭建路由与布局骨架（含预留导航入口） | Not Started |
| 集成 typed API client（基于 OpenAPI codegen） | Not Started |
| 实现 Project/Task/Run/Issue 各页面 | Not Started |
| 实现 Dashboard-as-Code 渲染器 | Not Started |
| 实现追溯可视化组件 | Not Started |
| 创建 AutoTriage/Simulation 占位页 | Not Started |
| 响应式适配与主题 | Not Started |
| 实现自定义 KPI 组件拆分（定义构建器 + 多图表渲染器） | Not Started |
| 实现车辆动态快照展示组件 | Not Started |
| 实现时序图表组件（多通道、多变量） | Not Started |
| 实现 Schema 字段自动同步选择器 | Not Started |
| 更新 normalize 函数适配新数据结构 | Not Started |

## 测试策略与验收标准

- 单元测试：核心组件与 Dashboard 渲染器（Vitest）。
- KPI 渲染器组件测试：自定义 KPI 多图表渲染器输入/输出验证。
- 字段选择器组件测试：Schema 字段自动同步选择器交互与数据绑定。
- E2E 测试：关键用户流程（Playwright）。
- 验收标准：
  - 所有 P0 页面可访问且数据联通。
  - Dashboard 可根据 JSON schema 动态渲染。
  - AutoTriage/Simulation 占位页存在且导航可达。
  - 自定义 KPI 看板可动态创建指标定义并渲染图表。
  - 字段选择器可从 Schema 注册表自动同步可用字段。

## 风险与依赖

- 依赖 `contracts/` 的 OpenAPI 定义稳定。
- 依赖 `apps/bff-gateway` 提供聚合 API。
- Dashboard-as-Code schema 需与 `services/kpi-engine` 协同定义。

## 变更记录

| 日期 | 责任人 | 变更内容 | 关联 Commit |
|------|--------|----------|-------------|
| 2026-02-22 | System | 初始化子模块计划 | - |
| 2026-02-23 | System | 追加 FE-10~FE-13：快照展示、时序图表、自定义 KPI 看板、字段选择器 | - |
