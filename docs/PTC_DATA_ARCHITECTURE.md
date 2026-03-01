# PTC Binding & KPI 数据查询逻辑与数据嵌套关系

> 本文档总结 PTC Binding 和 PTC KPI 两个页面的完整数据架构，为后续与外部数据库（里程、Hotline 等）的数据联调提供参考。

---

## 一、核心概念与数据模型

### 1.1 实体关系总览

```
PtcProject (1) ──→ (N) PtcTask (1) ──→ (0..1) PtcBinding
                                                    │
                                          ┌─────────┴──────────┐
                                          │  cars: IBindingCar[]│
                                          │    ├─ car_id        │
                                          │    └─ drives[]      │
                                          │       ├─ drive_id   │
                                          │       ├─ selected   │
                                          │       └─ deselect_* │
                                          └────────────────────-┘
                                                    │
                                          drive_id 引用 ↓
                                                    │
                                              PtcDrive (N:1)
                                              ├── car_id  → PtcCar
                                              ├── build_id → PtcBuild
                                              └── tag_id  → PtcTag
```

### 1.2 数据模型详情

#### PtcProject（`ptc_projects`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `project_id` | String (unique) | 项目唯一标识 |
| `name` | String (unique) | 项目名称 |
| `created_at` / `updated_at` | Date | 时间戳 |

#### PtcTask（`ptc_tasks`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `task_id` | String (unique) | 任务唯一标识 |
| `project_id` | String (ref PtcProject) | 所属项目 |
| `name` | String | 任务名称（同项目内唯一） |
| `start_date` / `end_date` | Date (optional) | 任务日期范围 |

#### PtcBinding（`ptc_bindings`）

每个 Task 最多一个 Binding（`task_id` 唯一索引）。

| 字段 | 类型 | 说明 |
|------|------|------|
| `binding_id` | String (unique) | Binding 唯一标识 |
| `task_id` | String (unique, ref PtcTask) | 关联的任务 |
| `status` | `'Draft' \| 'Published'` | 状态；KPI 页仅展示 Published |
| `filter_criteria` | `{ builds: string[], cars: string[], tags: string[] }` | 创建时使用的筛选条件 |
| `cars` | `IBindingCar[]` | 嵌套的车辆-Drive 绑定关系 |

**`IBindingCar` 嵌套结构：**
```typescript
{
  car_id: string;
  drives: Array<{
    drive_id: string;       // 引用 PtcDrive.drive_id
    selected: boolean;      // 是否纳入 KPI 计算
    deselect_reason_preset?: string;  // 预设排除原因
    deselect_reason_text?: string;    // 自定义排除原因
  }>;
}
```

#### PtcDrive（`ptc_drives`）

Drive 是最底层的数据单元，包含单次驾驶的所有量化指标。

| 字段分类 | 字段 | 说明 |
|---------|------|------|
| **标识** | `drive_id`, `car_id`, `build_id`, `tag_id` | 唯一标识与外键 |
| **时间** | `date`, `start_time`, `end_time` | 驾驶日期与起止时间 |
| **基础里程** | `mileage_km` | 总里程 |
| **事件统计** | `xl_events`, `l_events`, `hotline_count` | 事件/Hotline 计数 |
| **路线** | `route`, `road_type` (Highway/Urban/Ramp/Rural) | 路线与道路类型 |
| **模式里程** | `l2pp_mileage`, `l2p_mileage`, `acc_lk_mileage`, `acc_mileage`, `manual_mileage` | 各驾驶模式里程 |
| **场景里程** | `city_mileage`, `highway_mileage`, `ramp_mileage`, `rural_road_mileage` | 各场景里程 |
| **设施计数** | `toll_station_count`, `intersection_count`, `tfl_count`, `left_turn_count`, `right_turn_count` | 道路设施计数 |
| **安全指标** | `safety_takeover_count`, `silc_miss_route_count`, `wobble_count`, `ghost_brake_count`, `gb_harsh_count`, `dangerous_lc_count`, `lane_drift_count`, `lateral_position_count`, `atca_fn_count`, `atca_fp_count` | 安全/质量事件 |
| **纵向/横向** | `xl/l/ml/m_longitudinal_count`, `xl/l/ml_lateral_count` | 纵向/横向问题分级计数 |
| **匝道** | `entry_ramp_attempts/successes`, `exit_ramp_attempts/successes` | 匝道尝试与成功次数 |

#### PtcBuild / PtcCar / PtcTag（元数据表）

| 表 | 字段 | 说明 |
|---|------|------|
| `ptc_builds` | `build_id`, `version_tag`, `build_time` | 软件版本 |
| `ptc_cars` | `car_id`, `name`, `vin` | 车辆 |
| `ptc_tags` | `tag_id`, `name` | 标签（测试类型等） |

---

## 二、PTC Binding 页面数据查询逻辑

### 2.1 页面结构

```
PtcBindingPage
├── FilterBar（筛选栏）
├── ProjectCollapseList（项目折叠列表）
│   └── TaskCard × N（每个任务卡片）
├── AddProjectTaskModal（新建项目/任务弹窗）
├── TaskDetailModal（任务详情弹窗）
│   ├── Drive 时间线（Gantt）
│   ├── Car 表格（按车展示 drives）
│   ├── BindingConfigModal（新建 Binding）
│   └── DriveSelectionPopup（Drive 勾选/排除）
```

### 2.2 数据查询流程

#### 流程 1：加载项目列表

```
前端: usePtcOverview()
  → GET /api/ptc/overview
后端:
  1. PtcProject.find().sort({ updated_at: -1 })
  2. PtcTask.find().select('task_id project_id')
  3. 内存聚合 → 每个 project 的 task_count
响应: [{ project_id, name, task_count, ... }]
```

#### 流程 2：展开项目 → 加载任务列表

```
前端: usePtcOverviewProject(projectId)
  → GET /api/ptc/overview?project_id={id}
后端:
  1. PtcProject.findOne({ project_id })
  2. PtcTask.find({ project_id })
  3. PtcBinding.find({ task_id: { $in: taskIds } })
  4. 从 binding.cars[].drives[] 中提取 selected=true 的 drive_id
  5. PtcDrive.find({ drive_id: { $in: driveIds } })
  6. 内存聚合（每个 task）:
     - uniqueBuilds / uniqueCars / uniqueTags (Set)
     - totalMileage = Σ mileage_km
     - totalHotlines = Σ hotline_count
     - dailyMileage = 按日期分组的里程
响应: { project, tasks: PtcTaskSummary[] }
```

**PtcTaskSummary 结构：**
```typescript
{
  task_id, name, start_date, end_date,
  binding_status: 'Draft' | 'Published' | null,
  build_count, car_count, tag_count,
  hotline_count, total_mileage,
  daily_mileage: [{ date, km }],
  updated_at
}
```

#### 流程 3：点击任务 → 查看详情

```
前端: usePtcOverviewTask(taskId)
  → GET /api/ptc/overview/{taskId}
后端:
  1. PtcTask.findOne({ task_id })
  2. PtcBinding.findOne({ task_id })
  3. 提取 binding.cars[].drives[] 中所有 drive_id（不论 selected）
  4. PtcDrive.find({ drive_id: { $in: driveIds } })
  5. 将 drive detail 嵌入 binding.cars[].drives[].detail
响应: {
  task,
  binding: { ...binding, cars: [{ car_id, drives: [{ drive_id, selected, detail: PtcDrive }] }] },
  drives: PtcDrive[]
}
```

#### 流程 4：创建 Binding（筛选 Drives）

```
前端: usePtcDriveFilter({ builds, cars, tags })
  → GET /api/ptc/drives/filter?builds=...&cars=...&tags=...
后端:
  PtcDrive.aggregate([
    { $match: { build_id: {$in}, car_id: {$in}, tag_id: {$in} } },
    { $sort: { date: -1 } },
    { $group: {
        _id: '$car_id',
        drive_count, total_mileage, hotline_count,
        builds: { $addToSet: '$build_id' },
        tags: { $addToSet: '$tag_id' },
        min_date, max_date,
        drives: { $push: { drive_id, date, mileage_km, start_time, end_time } }
    }},
    { $sort: { _id: 1 } }
  ])
响应: PtcFilterResult[] (按 car 分组)
```

#### 流程 5：保存 Binding

```
前端: useCreatePtcBinding({ task_id, filter_criteria, cars, status })
  → POST /api/ptc/bindings
后端:
  1. 检查 task_id 存在
  2. 检查该 task 无已有 binding
  3. 构建 cars[] (每个 car 下的 drives 初始 selected=true)
  4. PtcBinding.save()
```

#### 流程 6：更新 Drive 选择状态

```
前端: useUpdatePtcBindingDrives(bindingId, { car_id, drive_updates })
  → PUT /api/ptc/bindings/{id}/drives
后端:
  1. PtcBinding.findOne({ binding_id })
  2. 找到对应 car，更新 drives[].selected 和 deselect 原因
  3. binding.save()
```

#### 流程 7：FilterBar 选项联动

```
前端: usePtcMetaOptions({ builds, tags, cars })
  → GET /api/ptc/meta/options?builds=...&tags=...&cars=...
后端:
  - 根据已选 tags+cars → PtcDrive.distinct('build_id') → 可用 builds
  - 根据已选 builds+cars → PtcDrive.distinct('tag_id') → 可用 tags
  - 根据已选 builds+tags → PtcDrive.distinct('car_id') → 可用 cars
  - 查出对应的 PtcBuild / PtcTag / PtcCar 详情
响应: { builds: PtcBuild[], tags: PtcTag[], cars: PtcCar[] }
```

---

## 三、PTC KPI 页面数据查询逻辑

### 3.1 页面结构

```
PtcKpiPage
├── Project 选择器
├── Summary Cards (Published Tasks, Total Mileage, Total Cars, ...)
├── PtcKpiChart（Bar/Line/Area/Pie/Radar 图表）
├── Published Tasks 表格
│   └── 点击行 → TaskKpiDetailModal
│       ├── Tab 1: L2P KPI (by Attribute)
│       ├── Tab 2: L2P KPI (by ODD)
│       └── CSV 导出
```

### 3.2 数据查询流程

#### 流程 1：加载 KPI 总览

```
前端: usePtcOverview()
  → GET /api/ptc/overview
  （同 Binding 页，获取所有项目列表）

前端: usePtcOverviewProject(selectedProjectId)
  → GET /api/ptc/overview?project_id={id}
  （同 Binding 页的流程 2）

前端过滤: tasks.filter(t => t.binding_status === 'Published')
前端聚合:
  - totalMileage = Σ total_mileage
  - totalCars = Σ car_count
  - totalBuilds = Σ build_count
  - totalHotlines = Σ hotline_count
  - avgMileage = totalMileage / publishedTasks.length
```

#### 流程 2：查看单个 Task 的 KPI 详情

```
前端: usePtcTaskKpi(taskId)
  → GET /api/ptc/overview/{taskId}/kpi
后端:
  1. PtcTask.findOne({ task_id })
  2. PtcBinding.findOne({ task_id })
  3. 提取 binding.cars[].drives[] 中 selected=true 的 drive_id
  4. PtcDrive.find({ drive_id: { $in: selectedDriveIds } })
  5. 调用 buildByAttributeTable(drives) 和 buildByOddTable(drives)
响应: { task, byAttribute: KpiRow[], byODD: OddKpiRow[] }
```

### 3.3 KPI 聚合计算逻辑

所有 KPI 聚合在后端 JavaScript 内存中完成（非 MongoDB 聚合管道）。

#### 辅助函数

| 函数 | 作用 |
|------|------|
| `sumField(drives, field)` | 对 drives 数组某字段求和 |
| `per100km(count, totalKm)` | 计算每 100km 出现次数 |
| `successRate(successes, attempts)` | 计算成功率百分比 |
| `round2(v)` | 四舍五入到 2 位小数 |

#### By Attribute 表（`buildByAttributeTable`）

| 分类 | KPI 指标 | 计算方式 |
|------|---------|---------|
| **Mileage** | L2PP/L2P/ACC+LK/ACC/Manual/City/Highway/Ramp/Rural mileage | `sumField(drives, field)` |
| **Mileage** | # of toll station / intersection / TFL / Left Turn / Right Turn | `sumField(drives, field)` |
| **Mileage** | Average Speed | `totalKm / totalHours` |
| **Overall KPI** | XL/L/ML/M Longitudinal Problem/Per 100KM | `per100km(sumField, totalKm)` |
| **Overall KPI** | XL/L/ML Lateral Problem/Per 100KM | `per100km(sumField, totalKm)` |

#### By ODD 表（`buildByOddTable`）

按 ODD（Operational Design Domain）分组，分 `All`（全部 drives）和 `Highway`（`road_type === 'Highway'`）两组。

| ODD | KPI 指标 | 计算方式 |
|-----|---------|---------|
| All + Highway | Mileage | `sumField('mileage_km')` |
| All + Highway | Safety Takeover / SILC Miss Route / Wobble / Ghost Brake All / GB Harsh / Dangerous LC / Lane Drift | `per100km(count, totalKm)` |
| **Highway only** | Entry/Exit Ramp success rate | `successRate(successes, attempts)` |
| **All only** | Lateral Position (Wobble+drift) / ATCA FN / ATCA FP | `per100km(count, totalKm)` |
| **All only** | Off-Highway Ghost Brake All / GB Harsh | `per100km(非Highway drives的count, 非Highway drives的mileage)` |

---

## 四、数据嵌套关系图

### 4.1 从前端视角的数据获取链

```
┌───────────────────────────────────────────────────────────────┐
│                      Frontend (React)                         │
│                                                               │
│  usePtcOverview()              → 项目列表 + task_count         │
│  usePtcOverviewProject(pid)    → 项目 + 任务摘要列表            │
│  usePtcOverviewTask(tid)       → 任务 + Binding + Drives 详情  │
│  usePtcTaskKpi(tid)            → 任务 + KPI表(byAttr/byODD)    │
│  usePtcDriveFilter({...})      → 按条件筛选 drives(按car分组)    │
│  usePtcMetaOptions({...})      → 联动的 builds/tags/cars 选项   │
└───────────────────────┬───────────────────────────────────────┘
                        │ HTTP
                        ▼
┌───────────────────────────────────────────────────────────────┐
│               BFF Gateway (Express Proxy)                     │
│               /api/ptc/* → ptc-service:3070                   │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│                  ptc-service (Express)                         │
│                                                               │
│  routes/overview.ts  → /overview, /overview/:taskId,          │
│                        /overview/:taskId/kpi                   │
│  routes/projects.ts  → /projects CRUD                         │
│  routes/tasks.ts     → /tasks CRUD                            │
│  routes/bindings.ts  → /bindings CRUD, /bindings/:id/drives   │
│  routes/meta.ts      → /builds, /cars, /tags, /drives,        │
│                        /drives/filter, /meta/options           │
└───────────────────────┬───────────────────────────────────────┘
                        │ Mongoose
                        ▼
┌───────────────────────────────────────────────────────────────┐
│                    MongoDB (Atlas)                             │
│                                                               │
│  ptc_projects   ptc_tasks    ptc_bindings                     │
│  ptc_drives     ptc_builds   ptc_cars      ptc_tags           │
└───────────────────────────────────────────────────────────────┘
```

### 4.2 核心数据嵌套关系

```
PtcProject
  └── PtcTask[] (via project_id)
        └── PtcBinding (0 or 1, via task_id, unique)
              ├── filter_criteria: { builds[], cars[], tags[] }
              └── cars: IBindingCar[]
                    └── drives: IBindingDrive[]
                          ├── drive_id → PtcDrive (lookup)
                          ├── selected: boolean  ← 决定是否参与 KPI
                          └── deselect_reason_*

PtcDrive (独立集合，被 Binding 引用)
  ├── car_id  → PtcCar
  ├── build_id → PtcBuild
  └── tag_id  → PtcTag
```

### 4.3 关键数据流节点

| 节点 | 说明 |
|------|------|
| **Binding.cars[].drives[].selected** | 核心控制点。决定哪些 Drive 参与 KPI 聚合 |
| **Binding.status** | `Published` 的 Binding 才会出现在 KPI 页面 |
| **PtcDrive 的 KPI 字段** | 所有 KPI 计算的数据源头，目前全部存储在 `ptc_drives` 集合中 |
| **内存聚合** | 所有 KPI 聚合（byAttribute/byODD）在 Node.js 内存完成，无 MongoDB Pipeline |

---

## 五、后续数据联调要点

### 5.1 当前数据来源

目前 PTC 的所有数据（Drive 里程、KPI 指标、Hotline 计数等）全部存在 `ptc_drives` 单一集合中。这些数据通过 `/ptc/seed` 接口生成的模拟数据。

### 5.2 Drive 的标识体系

在真实系统中，每个 Drive（对应一次 run）有**两个标识**：

| 标识 | 格式 | 用途 |
|------|------|------|
| `drive_id` | 数字串（如 `"123456"`） | 业务可读的 ID，用于日常引用和显示 |
| `uuid` | UUID v4 | 确保全局唯一性 |

两者指向同一个 run（一次驾驶记录），均可作为外部 API 的查询键。

### 5.3 联调方式：实时 API 聚合

采用**实时查询 + 聚合**方式（非 ETL 同步）：ptc-service 在请求时实时调用多个外部 API，获取数据后在内存中组合成需要的结构。

**优点：** 数据始终最新，无需维护同步任务。
**代价：** 请求延迟取决于外部 API 响应速度，可能需要并发调用和缓存策略。

### 5.4 外部 API 联调方向

后续需要将 PTC 的 Project/Task/Binding 与**外部 API** 对接，主要场景：

| 外部 API | 查询参数 | 获取数据 |
|----------|---------|---------|
| **Drive API** | `drive_id` 或 `uuid` | 真实 Drive 基础信息（car、build、时间、路线等）|
| **里程 API** | `drive_id` 或 `uuid` | 各模式/场景细分里程（L2PP、Highway、City 等）|
| **Hotline API** | `drive_id` 或 `uuid` | Hotline 记录与计数 |
| **安全事件 API** | `drive_id` 或 `uuid` | Safety Takeover、Ghost Brake 等事件数据 |
| **匝道/ODD API** | `drive_id` 或 `uuid` | 匝道进出成功率等指标 |

### 5.5 联调的关键接口（需改造）

**ptc-service 中需要改造的后端接口：**

1. **`GET /overview?project_id=`**（任务摘要列表）
   - 当前：`PtcDrive.find()` 直接查本地 MongoDB
   - 联调后：从 Binding 拿到 selected `drive_id` 列表 → 并发调用外部 API（里程/Hotline）→ 聚合结果

2. **`GET /overview/:taskId/kpi`**（KPI 详情表）
   - 当前：`PtcDrive.find()` 获取全部 KPI 字段，内存聚合
   - 联调后：`drive_id` 列表 → 并发调用多个外部 API → 合并成统一 drive 对象 → `buildByAttributeTable` / `buildByOddTable` 聚合

3. **`GET /drives/filter`**（Binding 创建时筛选 Drives）
   - 当前：`PtcDrive.aggregate()` 聚合管道
   - 联调后：调用外部 Drive API 获取可绑定的 Drive 列表，再按 car 分组

### 5.6 确定的联调架构

```
用户请求
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│  ptc-service (聚合调度层)                                      │
│                                                              │
│  1. 查 MongoDB → 获取 Binding (selected drive_ids/uuids)      │
│  2. 用 drive_id/uuid 并发调用外部 API                           │
│  3. 合并多个 API 响应 → 统一 drive 数据对象                       │
│  4. 内存聚合 → 计算 KPI / 生成摘要                               │
│  5. 返回给前端                                                 │
└────────┬──────────┬──────────┬──────────┬──────────────────-─┘
         │          │          │          │
    ┌────▼───┐ ┌────▼───┐ ┌───▼────┐ ┌───▼────┐
    │ PTC DB │ │里程 API │ │Hotline │ │安全事件 │ ...
    │MongoDB │ │        │ │  API   │ │  API   │
    └────────┘ └────────┘ └────────┘ └────────┘

PTC DB (MongoDB) 保持不变，存储:
  - Project / Task / Binding 关系
  - Binding.cars[].drives[].drive_id → 联查外部 API 的主键

外部 API 提供:
  - 里程细分（各模式/场景）
  - Hotline 记录
  - 安全/质量事件
  - 匝道/ODD 指标
```

### 5.7 Binding 作为数据联调的枢纽

**核心数据流：** Binding 建立后，`cars[].drives[].drive_id`（或对应的 UUID）就是联查所有外部 API 的 **主键桥梁**。

```
Task → Binding → selected drive_ids
  → 并发调用:
     ├── 里程 API(drive_ids)    → { drive_id: 里程数据 }
     ├── Hotline API(drive_ids) → { drive_id: hotline_count }
     ├── 安全事件 API(drive_ids) → { drive_id: 各事件计数 }
     └── ...
  → 按 drive_id 合并所有 API 响应
  → 组装成统一的 drive 对象（等价于当前 PtcDrive 的结构）
  → 传入 buildByAttributeTable / buildByOddTable → KPI 结果
```

### 5.8 联调注意事项

| 关注点 | 说明 |
|-------|------|
| **并发控制** | 多个外部 API 应使用 `Promise.all` 并发调用，减少总延迟 |
| **缓存策略** | 频繁访问的 KPI 数据可在 ptc-service 层加短期缓存（如 Redis 或内存 TTL） |
| **降级处理** | 某个外部 API 不可用时，对应字段返回 null/0，不阻塞整体 KPI 展示 |
| **批量查询** | 外部 API 最好支持批量 `drive_ids` 查询，避免逐个请求（N+1 问题） |
| **数据映射** | 外部 API 的字段名可能与 `PtcDrive` 不同，需要在 ptc-service 中做字段映射层 |
| **drive_id vs uuid** | 统一选定一种标识作为联调主键，建议优先使用 `drive_id`（可读性强），UUID 作为备选 |

---

## 六、React Query 缓存键结构

前端使用 `@tanstack/react-query`，查询键结构如下，联调时需注意缓存失效：

```typescript
const KEYS = {
  all:              ['ptc'],
  projects:         ['ptc', 'projects'],
  tasks:            ['ptc', 'tasks', projectId],
  overview:         ['ptc', 'overview'],
  overviewProject:  ['ptc', 'overview', 'project', projectId],
  overviewTask:     ['ptc', 'overview', 'task', taskId],
  taskKpi:          ['ptc', 'task-kpi', taskId],
  bindings:         ['ptc', 'bindings', params],
  binding:          ['ptc', 'binding', bindingId],
  builds:           ['ptc', 'builds', q],
  cars:             ['ptc', 'cars', params],
  tags:             ['ptc', 'tags', q],
  drives:           ['ptc', 'drives', params],
  driveFilter:      ['ptc', 'drive-filter', params],
  metaOptions:      ['ptc', 'meta-options', params],
};
```

所有 mutation（创建/更新/删除）统一用 `invalidateQueries({ queryKey: ['ptc'] })` 全量刷新。

---

## 七、MongoDB 索引参考

| 集合 | 索引 |
|------|------|
| `ptc_projects` | `project_id` (unique), `name` (text) |
| `ptc_tasks` | `task_id` (unique), `project_id`, `{project_id, name}` (unique), `name` (text) |
| `ptc_bindings` | `binding_id` (unique), `task_id` (unique), `status` |
| `ptc_drives` | `drive_id` (unique), `{car_id, build_id, tag_id}`, `date`, `build_id`, `tag_id`, `car_id` |

---

## 八、附录：API Endpoint 完整清单

| 方法 | 路径 | 用于页面 | 说明 |
|------|------|---------|------|
| GET | `/ptc/overview` | Binding + KPI | 项目列表（含 task_count） |
| GET | `/ptc/overview?project_id=` | Binding + KPI | 项目下的任务摘要 |
| GET | `/ptc/overview/:taskId` | Binding | 任务 + Binding + Drives 详情 |
| GET | `/ptc/overview/:taskId/kpi` | KPI | 任务 KPI (byAttribute + byODD) |
| GET | `/ptc/projects` | Binding | 项目搜索 |
| POST | `/ptc/projects` | Binding | 创建项目 |
| PUT | `/ptc/projects/:id` | Binding | 更新项目 |
| DELETE | `/ptc/projects/:id` | Binding | 删除项目 |
| GET | `/ptc/tasks` | Binding | 任务搜索 |
| POST | `/ptc/tasks` | Binding | 创建任务 |
| PUT | `/ptc/tasks/:id` | Binding | 更新任务 |
| DELETE | `/ptc/tasks/:id` | Binding | 删除任务 |
| GET | `/ptc/bindings` | Binding | 查询 Bindings |
| POST | `/ptc/bindings` | Binding | 创建 Binding |
| PUT | `/ptc/bindings/:id` | Binding | 更新 Binding |
| PUT | `/ptc/bindings/:id/drives` | Binding | 更新单车 Drive 选择 |
| DELETE | `/ptc/bindings/:id` | Binding | 删除 Binding |
| GET | `/ptc/builds` | Binding | Build 列表 |
| GET | `/ptc/cars` | Binding | Car 列表 |
| GET | `/ptc/tags` | Binding | Tag 列表 |
| GET | `/ptc/drives` | Binding | Drive 分页查询 |
| GET | `/ptc/drives/filter` | Binding | Drive 按条件筛选（聚合管道） |
| GET | `/ptc/meta/options` | Binding | 联动筛选选项 |
| POST | `/ptc/seed` | - | 种子数据生成 |
