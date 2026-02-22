import { Router, Request, Response } from 'express';
import { Task, Run, Issue, KpiSnapshot } from '@nvidopia/data-models';
import { asyncHandler } from '@nvidopia/service-toolkit';

const router = Router();

router.get('/mpi', asyncHandler(async (req: Request, res: Response) => {
  const { project_id, task_type, start_date, end_date } = req.query;
  if (!project_id) {
    res.status(400).json({ error: 'project_id is required' });
    return;
  }

  const taskFilter: Record<string, unknown> = { project_id };
  if (task_type) taskFilter.task_type = task_type;
  const tasks = await Task.find(taskFilter).lean();
  const taskIds = tasks.map((t) => t.task_id);

  const runFilter: Record<string, unknown> = { task_id: { $in: taskIds } };
  if (start_date || end_date) {
    runFilter.start_time = {};
    if (start_date) (runFilter.start_time as Record<string, unknown>).$gte = new Date(start_date as string);
    if (end_date) (runFilter.start_time as Record<string, unknown>).$lte = new Date(end_date as string);
  }

  const runs = await Run.find(runFilter).lean();
  const runIds = runs.map((r) => r.run_id);
  const totalMileage = runs.reduce((sum, r) => sum + (r.total_auto_mileage_km || 0), 0);

  const issueCount = await Issue.countDocuments({
    run_id: { $in: runIds },
    takeover_type: { $ne: null, $exists: true },
  });

  const mpi = issueCount > 0 ? totalMileage / issueCount : totalMileage > 0 ? Infinity : 0;

  const snapshot = await KpiSnapshot.findOne({
    metric_name: 'MPI',
    project_id,
  }).sort({ window_end: -1 }).lean();

  res.json({
    metric: 'MPI',
    value: mpi,
    precomputed_value: snapshot?.value ?? null,
    unit: 'km/intervention',
    project_id,
    filters: { task_type: task_type ?? null, start_date: start_date ?? null, end_date: end_date ?? null },
    computed_at: new Date().toISOString(),
  });
}));

router.get('/mttr', asyncHandler(async (req: Request, res: Response) => {
  const { project_id, start_date, end_date } = req.query;
  if (!project_id) {
    res.status(400).json({ error: 'project_id is required' });
    return;
  }

  const tasks = await Task.find({ project_id }).lean();
  const taskIds = tasks.map((t) => t.task_id);
  const runs = await Run.find({ task_id: { $in: taskIds } }).lean();
  const runIds = runs.map((r) => r.run_id);

  const issueFilter: Record<string, unknown> = {
    run_id: { $in: runIds },
    status: 'Fixed',
  };
  if (start_date || end_date) {
    issueFilter.created_at = {};
    if (start_date) (issueFilter.created_at as Record<string, unknown>).$gte = new Date(start_date as string);
    if (end_date) (issueFilter.created_at as Record<string, unknown>).$lte = new Date(end_date as string);
  }

  const issues = await Issue.find(issueFilter).lean();

  let totalHours = 0;
  let count = 0;
  for (const issue of issues) {
    if (issue.created_at && issue.updated_at) {
      const diffMs = new Date(issue.updated_at).getTime() - new Date(issue.created_at).getTime();
      totalHours += diffMs / (1000 * 60 * 60);
      count++;
    }
  }

  const mttr = count > 0 ? totalHours / count : 0;

  res.json({
    metric: 'MTTR',
    value: parseFloat(mttr.toFixed(2)),
    unit: 'hours',
    project_id,
    issue_count: count,
    filters: { start_date: start_date ?? null, end_date: end_date ?? null },
    computed_at: new Date().toISOString(),
  });
}));

router.get('/regression-pass-rate', asyncHandler(async (req: Request, res: Response) => {
  const { project_id, task_id } = req.query;
  if (!project_id) {
    res.status(400).json({ error: 'project_id is required' });
    return;
  }

  const taskFilter: Record<string, unknown> = { project_id };
  if (task_id) taskFilter.task_id = task_id;
  const tasks = await Task.find(taskFilter).lean();
  const taskIds = tasks.map((t) => t.task_id);

  const runs = await Run.find({ task_id: { $in: taskIds } }).lean();
  const runIds = runs.map((r) => r.run_id);

  const passed = await Issue.countDocuments({
    run_id: { $in: runIds },
    category: 'RegressionTracking',
    status: 'Closed',
  });

  const failed = await Issue.countDocuments({
    run_id: { $in: runIds },
    category: 'RegressionTracking',
    status: 'Reopened',
  });

  const totalTested = passed + failed;
  const rate = totalTested > 0 ? (passed / totalTested) * 100 : 0;

  res.json({
    metric: 'RegressionPassRate',
    value: parseFloat(rate.toFixed(2)),
    total_tested: totalTested,
    passed,
    failed,
    project_id,
    computed_at: new Date().toISOString(),
  });
}));

router.get('/fleet-utilization', asyncHandler(async (req: Request, res: Response) => {
  const { project_id, start_date, end_date } = req.query;
  if (!project_id) {
    res.status(400).json({ error: 'project_id is required' });
    return;
  }

  const tasks = await Task.find({ project_id }).lean();
  const taskIds = tasks.map((t) => t.task_id);

  const runFilter: Record<string, unknown> = {
    task_id: { $in: taskIds },
    status: { $in: ['Running', 'Completed'] },
  };
  if (start_date || end_date) {
    runFilter.start_time = {};
    if (start_date) (runFilter.start_time as Record<string, unknown>).$gte = new Date(start_date as string);
    if (end_date) (runFilter.start_time as Record<string, unknown>).$lte = new Date(end_date as string);
  }

  const runs = await Run.find(runFilter).lean();

  let totalRunDurationMs = 0;
  let totalPeriodMs = 0;
  const vehicleWindows = new Map<string, { earliest: Date; latest: Date }>();

  for (const run of runs) {
    const start = new Date(run.start_time as Date);
    const end = run.end_time ? new Date(run.end_time as Date) : new Date();
    totalRunDurationMs += end.getTime() - start.getTime();

    const existing = vehicleWindows.get(run.vehicle_vin);
    if (!existing) {
      vehicleWindows.set(run.vehicle_vin, { earliest: start, latest: end });
    } else {
      if (start < existing.earliest) existing.earliest = start;
      if (end > existing.latest) existing.latest = end;
    }
  }

  for (const window of vehicleWindows.values()) {
    totalPeriodMs += window.latest.getTime() - window.earliest.getTime();
  }

  const utilization = totalPeriodMs > 0 ? (totalRunDurationMs / totalPeriodMs) * 100 : 0;

  res.json({
    metric: 'FleetUtilization',
    value: parseFloat(utilization.toFixed(2)),
    unit: 'percent',
    vehicles_active: vehicleWindows.size,
    project_id,
    filters: { start_date: start_date ?? null, end_date: end_date ?? null },
    computed_at: new Date().toISOString(),
  });
}));

router.get('/issue-convergence', asyncHandler(async (req: Request, res: Response) => {
  const { project_id, start_date, end_date, interval = 'day' } = req.query;
  if (!project_id) {
    res.status(400).json({ error: 'project_id is required' });
    return;
  }

  const tasks = await Task.find({ project_id }).lean();
  const taskIds = tasks.map((t) => t.task_id);
  const runs = await Run.find({ task_id: { $in: taskIds } }).lean();
  const runIds = runs.map((r) => r.run_id);

  const dateMatch: Record<string, unknown> = {};
  if (start_date) dateMatch.$gte = new Date(start_date as string);
  if (end_date) dateMatch.$lte = new Date(end_date as string);

  const dateGroupFormat = interval === 'week'
    ? '%Y-W%V'
    : interval === 'month'
      ? '%Y-%m'
      : '%Y-%m-%d';

  const newIssues = await Issue.aggregate([
    {
      $match: {
        run_id: { $in: runIds },
        ...(Object.keys(dateMatch).length > 0 ? { created_at: dateMatch } : {}),
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: dateGroupFormat, date: '$created_at' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const closedIssues = await Issue.aggregate([
    {
      $match: {
        run_id: { $in: runIds },
        status: { $in: ['Closed', 'Fixed'] },
        ...(Object.keys(dateMatch).length > 0 ? { updated_at: dateMatch } : {}),
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: dateGroupFormat, date: '$updated_at' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const closedMap = new Map(closedIssues.map((c) => [c._id, c.count]));
  const allDates = new Set([
    ...newIssues.map((n) => n._id as string),
    ...closedIssues.map((c) => c._id as string),
  ]);
  const sortedDates = [...allDates].sort();

  const timeSeries = sortedDates.map((date) => ({
    date,
    new_issues: newIssues.find((n) => n._id === date)?.count ?? 0,
    closed_issues: closedMap.get(date) ?? 0,
  }));

  res.json({
    metric: 'IssueConvergence',
    project_id,
    interval,
    series: timeSeries,
    filters: { start_date: start_date ?? null, end_date: end_date ?? null },
    computed_at: new Date().toISOString(),
  });
}));

export default router;
