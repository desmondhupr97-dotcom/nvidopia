import { Router, type Request, type Response } from 'express';
import { PtcProject, PtcTask, PtcBinding, PtcDrive } from '@nvidopia/data-models';
import { asyncHandler } from '@nvidopia/service-toolkit';

const router = Router();

router.get('/overview', asyncHandler(async (req: Request, res: Response) => {
  const { project_id } = req.query;

  if (project_id && typeof project_id === 'string') {
    const project = await PtcProject.findOne({ project_id }).lean();
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const tasks = await PtcTask.find({ project_id }).lean();
    const taskIds = tasks.map((t) => t.task_id);
    const bindings = await PtcBinding.find({ task_id: { $in: taskIds } }).lean();
    const bindingMap = new Map(bindings.map((b) => [b.task_id, b]));

    const driveIds = bindings.flatMap((b) =>
      b.cars.flatMap((c) => c.drives.filter((d) => d.selected).map((d) => d.drive_id)),
    );
    const drives = driveIds.length > 0
      ? await PtcDrive.find({ drive_id: { $in: driveIds } }).lean()
      : [];
    const drivesByTask = new Map<string, typeof drives>();
    for (const binding of bindings) {
      const selectedDriveIds = new Set(
        binding.cars.flatMap((c) => c.drives.filter((d) => d.selected).map((d) => d.drive_id)),
      );
      drivesByTask.set(
        binding.task_id,
        drives.filter((d) => selectedDriveIds.has(d.drive_id)),
      );
    }

    const taskSummaries = tasks.map((task) => {
      const binding = bindingMap.get(task.task_id);
      const taskDrives = drivesByTask.get(task.task_id) || [];
      const uniqueBuilds = new Set(taskDrives.map((d) => d.build_id));
      const uniqueCars = new Set(taskDrives.map((d) => d.car_id));
      const uniqueTags = new Set(taskDrives.map((d) => d.tag_id));
      const totalMileage = taskDrives.reduce((s, d) => s + d.mileage_km, 0);
      const totalHotlines = taskDrives.reduce((s, d) => s + d.hotline_count, 0);
      const dates = taskDrives.map((d) => new Date(d.date).getTime()).sort((a, b) => a - b);

      const dailyMileage: Record<string, number> = {};
      for (const d of taskDrives) {
        const key = new Date(d.date).toISOString().slice(0, 10);
        dailyMileage[key] = (dailyMileage[key] || 0) + d.mileage_km;
      }

      return {
        task_id: task.task_id,
        name: task.name,
        start_date: task.start_date || (dates.length ? new Date(dates[0]) : null),
        end_date: task.end_date || (dates.length ? new Date(dates[dates.length - 1]) : null),
        binding_status: binding?.status || null,
        build_count: uniqueBuilds.size,
        car_count: uniqueCars.size,
        tag_count: uniqueTags.size,
        hotline_count: totalHotlines,
        total_mileage: Math.round(totalMileage * 100) / 100,
        daily_mileage: Object.entries(dailyMileage)
          .map(([date, km]) => ({ date, km: Math.round(km * 100) / 100 }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        updated_at: binding?.updated_at || task.updated_at,
      };
    });

    res.json({ project, tasks: taskSummaries });
    return;
  }

  const projects = await PtcProject.find().sort({ updated_at: -1 }).lean();
  const allTasks = await PtcTask.find().select('task_id project_id').lean();
  const taskCountMap = new Map<string, number>();
  for (const t of allTasks) {
    taskCountMap.set(t.project_id, (taskCountMap.get(t.project_id) || 0) + 1);
  }

  const result = projects.map((p) => ({
    ...p,
    task_count: taskCountMap.get(p.project_id) || 0,
  }));
  res.json(result);
}));

router.get('/overview/:taskId', asyncHandler(async (req: Request, res: Response) => {
  const task = await PtcTask.findOne({ task_id: req.params.taskId }).lean();
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const binding = await PtcBinding.findOne({ task_id: req.params.taskId }).lean();
  if (!binding) {
    res.json({ task, binding: null, drives: [] });
    return;
  }

  const driveIds = binding.cars.flatMap((c) => c.drives.map((d) => d.drive_id));
  const drives = driveIds.length > 0
    ? await PtcDrive.find({ drive_id: { $in: driveIds } }).lean()
    : [];

  const driveMap = new Map(drives.map((d) => [d.drive_id, d]));
  const enrichedBinding = {
    ...binding,
    cars: binding.cars.map((car) => ({
      ...car,
      drives: car.drives.map((d) => ({
        ...d,
        detail: driveMap.get(d.drive_id) || null,
      })),
    })),
  };

  res.json({ task, binding: enrichedBinding, drives });
}));

// ---- KPI aggregation helpers ----

function sumField(drives: Array<Record<string, any>>, field: string): number {
  return drives.reduce((s, d) => s + (Number(d[field]) || 0), 0);
}

function per100km(count: number, totalKm: number): number {
  if (totalKm <= 0) return 0;
  return Math.round((count / totalKm) * 100 * 100) / 100;
}

function successRate(successes: number, attempts: number): number {
  if (attempts <= 0) return 0;
  return Math.round((successes / attempts) * 100 * 100) / 100;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

interface KpiRow {
  kpi_category: string;
  attribute?: string;
  kpi_item: string;
  unit: string;
  target: string;
  define_baseline: string;
  kpi_normalized: string;
  gvs_group_normalized: string;
  total: string;
  gvs_group: string;
}

function buildByAttributeTable(drives: Array<Record<string, any>>, gvsGroupId: string): KpiRow[] {
  const totalKm = sumField(drives, 'mileage_km');
  const rows: KpiRow[] = [];

  const mileageItems: Array<{ item: string; field: string }> = [
    { item: 'L2PP mileage', field: 'l2pp_mileage' },
    { item: 'L2P mileage', field: 'l2p_mileage' },
    { item: 'ACC+LK mileage', field: 'acc_lk_mileage' },
    { item: 'ACC mileage', field: 'acc_mileage' },
    { item: 'Manual mileage', field: 'manual_mileage' },
    { item: 'City mileage', field: 'city_mileage' },
    { item: 'Highway mileage', field: 'highway_mileage' },
    { item: 'Ramp mileage', field: 'ramp_mileage' },
    { item: 'Rural_road mileage', field: 'rural_road_mileage' },
  ];
  for (const m of mileageItems) {
    const val = round2(sumField(drives, m.field));
    rows.push({
      kpi_category: 'Mileage',
      attribute: 'Mileage',
      kpi_item: m.item,
      unit: 'km',
      target: '-',
      define_baseline: '-',
      kpi_normalized: '-',
      gvs_group_normalized: '-',
      total: String(val),
      gvs_group: `${gvsGroupId} ${val}`,
    });
  }

  const countItems: Array<{ item: string; field: string }> = [
    { item: '# of toll station', field: 'toll_station_count' },
    { item: 'Average Speed', field: '' },
    { item: '# of intersection', field: 'intersection_count' },
    { item: '# of TFL', field: 'tfl_count' },
    { item: '# of Left Turn', field: 'left_turn_count' },
    { item: '# of Right Turn', field: 'right_turn_count' },
  ];
  for (const c of countItems) {
    let val: string;
    if (c.field === '') {
      const totalTime = drives.reduce((s, d) => {
        const st = new Date(d.start_time).getTime();
        const et = new Date(d.end_time).getTime();
        return s + (et - st);
      }, 0);
      const hours = totalTime / 3600000;
      val = hours > 0 ? String(round2(totalKm / hours)) : '-';
    } else {
      val = String(sumField(drives, c.field));
    }
    rows.push({
      kpi_category: 'Mileage',
      attribute: 'Mileage',
      kpi_item: c.item,
      unit: c.item === 'Average Speed' ? 'km/h' : '',
      target: '-',
      define_baseline: '-',
      kpi_normalized: '-',
      gvs_group_normalized: '-',
      total: val,
      gvs_group: `${gvsGroupId} ${val}`,
    });
  }

  const overallPer100km: Array<{ item: string; field: string }> = [
    { item: 'XL Longitudal Problem/Per 100KM', field: 'xl_longitudinal_count' },
    { item: 'L Longitudal Problem/Per 100KM', field: 'l_longitudinal_count' },
    { item: 'ML Longitudal Problem/Per 100KM', field: 'ml_longitudinal_count' },
    { item: 'M Longitudal Problem/Per 100KM', field: 'm_longitudinal_count' },
    { item: 'XL Lateral Problem/Per 100KM', field: 'xl_lateral_count' },
    { item: 'L Lateral Problem/Per 100KM', field: 'l_lateral_count' },
    { item: 'ML Lateral Problem/Per 100KM', field: 'ml_lateral_count' },
  ];
  for (const o of overallPer100km) {
    const count = sumField(drives, o.field);
    const rate = per100km(count, totalKm);
    rows.push({
      kpi_category: 'Overall KPI',
      attribute: '',
      kpi_item: o.item,
      unit: '',
      target: '-',
      define_baseline: '-',
      kpi_normalized: `${gvsGroupId} ${rate}`,
      gvs_group_normalized: `${gvsGroupId} ${rate}`,
      total: String(rate),
      gvs_group: `${gvsGroupId} ${rate}`,
    });
  }

  return rows;
}

interface OddKpiRow {
  odd: string;
  kpi_item: string;
  unit: string;
  target: string;
  define: string;
  baseline: string;
  kpi_normalized: string;
  gvs_group_normalized: string;
  total: string;
  gvs_group: string;
}

function buildByOddTable(drives: Array<Record<string, any>>, gvsGroupId: string): OddKpiRow[] {
  const groups: Record<string, Array<Record<string, any>>> = { All: drives };
  const hwDrives = drives.filter((d) => d.road_type === 'Highway');
  if (hwDrives.length > 0) groups['Highway'] = hwDrives;

  const rows: OddKpiRow[] = [];

  for (const [odd, grp] of Object.entries(groups)) {
    const totalKm = sumField(grp, 'mileage_km');
    const isAll = odd === 'All';

    const items: Array<{ item: string; unit: string; target: string; compute: () => number | string }> = [
      { item: 'Mileage', unit: 'km', target: isAll ? '5000' : '>=3000', compute: () => round2(totalKm) },
      { item: 'Safety Takeover', unit: '(count/100km)', target: '<= 0.5', compute: () => per100km(sumField(grp, 'safety_takeover_count'), totalKm) },
      { item: 'SILC Miss Route', unit: '(count/100km)', target: '0.5', compute: () => per100km(sumField(grp, 'silc_miss_route_count'), totalKm) },
      { item: 'Wobble', unit: '(count/100km)', target: '<= 0.5', compute: () => per100km(sumField(grp, 'wobble_count'), totalKm) },
      { item: 'Ghost Brake All', unit: '(count/100km)', target: '<=0.6', compute: () => per100km(sumField(grp, 'ghost_brake_count'), totalKm) },
      { item: 'GB Harsh', unit: '(count/100km)', target: '<=0.3', compute: () => per100km(sumField(grp, 'gb_harsh_count'), totalKm) },
      { item: 'Dangerous LC', unit: '(count/100km)', target: '<=0.3', compute: () => per100km(sumField(grp, 'dangerous_lc_count'), totalKm) },
      { item: 'Lane Drift', unit: '(count/100km)', target: '<=0.3', compute: () => per100km(sumField(grp, 'lane_drift_count'), totalKm) },
    ];

    if (!isAll) {
      items.push(
        {
          item: 'Entry Ramp success rate', unit: '%', target: '>=90%',
          compute: () => successRate(sumField(grp, 'entry_ramp_successes'), sumField(grp, 'entry_ramp_attempts')),
        },
        {
          item: 'Exit Ramp success rate', unit: '%', target: '>=90%',
          compute: () => successRate(sumField(grp, 'exit_ramp_successes'), sumField(grp, 'exit_ramp_attempts')),
        },
      );
    }

    if (isAll) {
      items.push(
        { item: 'Lateral Position (Wobble+drift)', unit: '(count/100km)', target: '<=6', compute: () => per100km(sumField(grp, 'lateral_position_count'), totalKm) },
        { item: 'ATCA FN', unit: '(count/100km)', target: '<= 2', compute: () => per100km(sumField(grp, 'atca_fn_count'), totalKm) },
        { item: 'ATCA FP', unit: '(count/100km)', target: '<=1', compute: () => per100km(sumField(grp, 'atca_fp_count'), totalKm) },
      );
    }

    // Off-Highway specific metrics for All group
    if (isAll) {
      items.push(
        { item: 'Off-Highway Ghost Brake All', unit: '(count/100km)', target: '<=8', compute: () => per100km(sumField(grp.filter((d: any) => d.road_type !== 'Highway'), 'ghost_brake_count'), sumField(grp.filter((d: any) => d.road_type !== 'Highway'), 'mileage_km')) },
        { item: 'Off-Highway GB Harsh', unit: '(count/100km)', target: '<=5', compute: () => per100km(sumField(grp.filter((d: any) => d.road_type !== 'Highway'), 'gb_harsh_count'), sumField(grp.filter((d: any) => d.road_type !== 'Highway'), 'mileage_km')) },
      );
    }

    for (const it of items) {
      const val = it.compute();
      const valStr = typeof val === 'number' ? String(val) : val;
      rows.push({
        odd,
        kpi_item: it.item,
        unit: it.unit,
        target: it.target,
        define: 'XXX',
        baseline: 'XXX',
        kpi_normalized: `${gvsGroupId} ${valStr}`,
        gvs_group_normalized: valStr,
        total: valStr,
        gvs_group: `${gvsGroupId} ${valStr}`,
      });
    }
  }

  return rows;
}

router.get('/overview/:taskId/kpi', asyncHandler(async (req: Request, res: Response) => {
  const task = await PtcTask.findOne({ task_id: req.params.taskId }).lean();
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const binding = await PtcBinding.findOne({ task_id: req.params.taskId }).lean();
  if (!binding) {
    res.json({ task, byAttribute: [], byODD: [] });
    return;
  }

  const selectedDriveIds = binding.cars.flatMap((c) =>
    c.drives.filter((d) => d.selected).map((d) => d.drive_id),
  );

  const drives = selectedDriveIds.length > 0
    ? await PtcDrive.find({ drive_id: { $in: selectedDriveIds } }).lean()
    : [];

  const gvsGroupId = String((task as any)._id ?? req.params.taskId);

  const byAttribute = buildByAttributeTable(drives as any[], gvsGroupId);
  const byODD = buildByOddTable(drives as any[], gvsGroupId);

  res.json({ task, byAttribute, byODD });
}));

export default router;
