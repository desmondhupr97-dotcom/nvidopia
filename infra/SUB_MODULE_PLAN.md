# SUB_MODULE_PLAN: infra

## 模块目标与边界

基础设施即代码。提供本地开发环境（Docker Compose）、CI/CD 配置、部署模板与环境变量管理，支撑所有微服务的本地运行与发布。

**边界**：
- 负责：Docker Compose（Kafka、MongoDB、各微服务）、Dockerfile 模板、CI 流水线配置、环境变量模板。
- 不负责：业务代码、数据模型。

## 功能拆解（需求项）

| ID | 功能 | 优先级 | 状态 |
|----|------|--------|------|
| IF-01 | Docker Compose 本地环境（Kafka + Zookeeper + MongoDB） | P0 | Not Started |
| IF-02 | 各微服务 Dockerfile | P0 | Not Started |
| IF-03 | Docker Compose 全栈编排（所有服务 + 基础设施） | P0 | Not Started |
| IF-04 | 环境变量模板（.env.example） | P0 | Not Started |
| IF-05 | CI 流水线配置（GitHub Actions：lint/test/build） | P1 | Not Started |
| IF-06 | 镜像构建与推送脚本 | P2 | Not Started |
| IF-07 | ptc-service 容器编排（Docker Compose + Dockerfile + Cloud Run 集成） | P0 | Not Started |

## 数据与接口契约

- Docker Compose 对外暴露端口规范：
  - MongoDB: 27017
  - Kafka: 9092
  - Gateway: 3000
  - Frontend: 5173
  - 各微服务: 3001-3006
  - ptc-service: 3007

## 开发任务清单

| 任务 | 状态 |
|------|------|
| 编写基础设施 Docker Compose | Not Started |
| 编写微服务 Dockerfile 模板 | Not Started |
| 编写全栈 Docker Compose | Not Started |
| 编写 .env.example | Not Started |
| 编写 GitHub Actions CI 配置 | Not Started |
| 添加 ptc-service 到 docker-compose.full.yml | Not Started |
| 更新 Dockerfile 包含 ptc-service | Not Started |
| 更新 start-all.sh 启动 ptc-service | Not Started |

## 测试策略与验收标准

- 验收标准：
  - `docker-compose up` 可一键启动全部基础设施。
  - 所有微服务可在容器中正常启动。
  - CI 流水线可在 push 时自动触发 lint/test/build。

## 风险与依赖

- Kafka/MongoDB 版本需要与 platform/ 模块兼容。
- 端口冲突需要在开发团队中协调。

## 变更记录

| 日期 | 责任人 | 变更内容 | 关联 Commit |
|------|--------|----------|-------------|
| 2026-02-22 | System | 初始化子模块计划 | - |
| 2026-02-27 | System | 追加 IF-07：ptc-service 容器编排 | - |
