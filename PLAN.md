# PLAN.md - Nvidopia 自动驾驶软件迭代优化中台 总控计划

> 本文档为项目唯一总控计划，汇总所有子模块 `SUB_MODULE_PLAN.md` 的里程碑、依赖关系与验收目标。

## 1. 项目概述

构建一个前后端分离、微服务部署的自动驾驶路测中台系统，覆盖 Project/Task/Run/Issue 全链路管理、KPI 看板与 ASPICE/ISO 26262 双向追溯能力。

- **输入 PRD**：[INIT_PRD.md](INIT_PRD.md)
- **架构**：前后端分离 + 微服务 + Kafka 事件总线 + MongoDB
- **本期不做**：自动 triage、仿真测试（预留扩展位）

## 2. 全局阶段路线图

| 里程碑 | 阶段 | 交付物 | 目标周 |
|--------|------|--------|--------|
| **M1** | 阶段 0 - 工程与治理基建 | 模块目录 + 全量 SUB_MODULE_PLAN + PLAN.md + 本地可运行环境 + 契约初版 | Week 1 |
| **M2** | 阶段 1-2 - 域模型与微服务 | 核心 6 个微服务可运行，Issue 状态机与追溯 API 可用 | Week 2-4 |
| **M3** | 阶段 3 - 前端应用 | 前端核心页面与 Dashboard-as-Code 可用，预留页上线 | Week 3-5 |
| **M4** | 阶段 4 - 联调与发布 | E2E 打通、验收脚本、灰度发布能力完成 | Week 5-6 |
| **M5** | 阶段 5 - 字段容错 + 数据快照 + 自定义 KPI | 模型字段容错（strict:false + extra field）、Issue 快照与时序数据、Schema Registry API、自定义 KPI（CRUD + 公式引擎 + 多图表 Dashboard）、API 测试套件（Vitest + 集成测试 + E2E Smoke 扩展） | Week 7-9 |

## 3. 子模块状态看板

| 模块 | 路径 | 状态 | 负责人 |
|------|------|------|--------|
| 前端应用 | [apps/frontend/SUB_MODULE_PLAN.md](apps/frontend/SUB_MODULE_PLAN.md) | M5 InProgress | - |
| BFF 网关 | [apps/bff-gateway/SUB_MODULE_PLAN.md](apps/bff-gateway/SUB_MODULE_PLAN.md) | M5 InProgress | - |
| 发布管理服务 | [services/release-manager/SUB_MODULE_PLAN.md](services/release-manager/SUB_MODULE_PLAN.md) | Done | - |
| 车队调度服务 | [services/fleet-manager/SUB_MODULE_PLAN.md](services/fleet-manager/SUB_MODULE_PLAN.md) | Done | - |
| Issue 工作流服务 | [services/issue-workflow/SUB_MODULE_PLAN.md](services/issue-workflow/SUB_MODULE_PLAN.md) | M5 InProgress | - |
| 追溯服务 | [services/traceability/SUB_MODULE_PLAN.md](services/traceability/SUB_MODULE_PLAN.md) | Done | - |
| KPI 引擎 | [services/kpi-engine/SUB_MODULE_PLAN.md](services/kpi-engine/SUB_MODULE_PLAN.md) | M5 InProgress | - |
| 事件平台 | [platform/eventing/SUB_MODULE_PLAN.md](platform/eventing/SUB_MODULE_PLAN.md) | Done | - |
| 数据模型 | [platform/data-models/SUB_MODULE_PLAN.md](platform/data-models/SUB_MODULE_PLAN.md) | M5 InProgress | - |
| 可观测性 | [platform/observability/SUB_MODULE_PLAN.md](platform/observability/SUB_MODULE_PLAN.md) | Done | - |
| 契约管理 | [contracts/SUB_MODULE_PLAN.md](contracts/SUB_MODULE_PLAN.md) | Done | - |
| 基础设施 | [infra/SUB_MODULE_PLAN.md](infra/SUB_MODULE_PLAN.md) | Done | - |
| 文档中心 | [docs/SUB_MODULE_PLAN.md](docs/SUB_MODULE_PLAN.md) | M5 InProgress | - |

## 4. 跨模块接口冻结点与联调窗口

| 接口/契约 | 冻结时间 | 涉及模块 | 联调窗口 |
|-----------|----------|----------|----------|
| OpenAPI 各服务 spec | M1 结束 | contracts, 所有微服务, frontend | M2 开始 |
| AsyncAPI 事件 spec | M1 结束 | contracts, eventing, 所有消费者 | M2 开始 |
| Dashboard JSON Schema | M2 结束 | contracts, kpi-engine, frontend | M3 开始 |
| Issue 状态机规则 | M2 结束 | issue-workflow, frontend, release-manager | M3 开始 |
| 全链路 E2E | M3 结束 | 全部模块 | M4 |
| Schema Registry API 契约 | M5 初期 | kpi-engine, bff-gateway, frontend | M5 中期 |
| Issue 快照/时序 API 契约 | M5 初期 | issue-workflow, bff-gateway, frontend | M5 中期 |
| 自定义 KPI Definition API 契约 | M5 初期 | kpi-engine, bff-gateway, frontend | M5 中期 |

## 5. 全局测试验收门禁

### M1 验收
- [x] 所有模块目录存在且 SUB_MODULE_PLAN.md 已初始化
- [x] Docker Compose 可一键启动 Kafka + MongoDB
- [x] 契约初版通过 spectral lint

### M2 验收
- [x] 6 个微服务可独立启动并通过健康检查
- [x] Issue 状态机完整流转（New -> Closed 全路径）
- [x] 追溯 API 可完成正反向查询
- [x] Kafka 消费者含 DLQ 机制

### M3 验收
- [x] 前端所有 P0 页面可访问
- [x] Dashboard-as-Code 渲染器可根据 JSON 动态生成图表
- [x] AutoTriage/Simulation 占位页可导航

### M4 验收
- [x] 模拟车端消息 -> Issue 生成 -> 流转 -> 闭环 -> KPI 展示 E2E 可跑通
- [x] 可观测性看板可显示服务状态
- [x] 各任务类型（Smoke/Gray/Freeze/Retest）最小路径可验证

### M5 验收
- [ ] 旧数据在新 Schema 下正确工作（字段容错验证）
- [ ] Issue 快照与时序数据可写入并可查询
- [ ] 自定义 KPI 可创建、计算并在 Dashboard 展示
- [ ] Schema Registry 返回最新字段列表
- [ ] 所有 API 测试用例通过
- [ ] E2E Smoke 测试新增步骤通过

## 6. Git 提交与推送策略

- **触发时机**：需求修改完成、开发完成、验收完成后必须 `git commit` + `git push`。
- **执行顺序**：先更新 SUB_MODULE_PLAN.md / PLAN.md，再提交代码。
- **提交信息规范**：
  - `docs(plan): update <module> sub module plan`
  - `feat(<service>): implement <capability>`
  - `test(<module>): complete acceptance for <scope>`

## 7. 预留扩展策略

| 预留能力 | 当前状态 | 扩展方式 |
|----------|----------|----------|
| 自动 Triage | 桩接口（501 Not Implemented） | 插入规则引擎/ML 模型服务 |
| 仿真测试 | 预留字段 simulation_ref/status | 对接仿真执行器与结果回写 |
| 自定义公式引擎 | M5 基础实现（四则运算 + 聚合函数） | 扩展自定义函数库 / DSL / 沙箱执行环境 |
