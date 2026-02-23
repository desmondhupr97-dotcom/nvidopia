import { Router } from 'express';
import { VehicleTrajectory, Issue, Run } from '@nvidopia/data-models';
import { asyncHandler } from '@nvidopia/service-toolkit';

const router = Router();

router.get('/trajectory/query', asyncHandler(async (req, res) => {
  const { vin, run_id, task_id, project_id, start_time, end_time, limit: limitStr } = req.query;

  const filter: Record<string, unknown> = {};
  if (vin) filter.vin = vin;
  if (run_id) filter.run_id = run_id;

  if (task_id || project_id) {
    const runFilter: Record<string, unknown> = {};
    if (task_id) runFilter.task_id = task_id;
    if (project_id) {
      const { Task } = await import('@nvidopia/data-models');
      const taskIds = await Task.find({ project_id }).distinct('task_id');
      runFilter.task_id = { $in: taskIds };
    }
    const runIds = await Run.find(runFilter).distinct('run_id');
    filter.run_id = { $in: runIds };
  }

  if (start_time || end_time) {
    const tsFilter: Record<string, unknown> = {};
    if (start_time) tsFilter.$gte = new Date(start_time as string);
    if (end_time) tsFilter.$lte = new Date(end_time as string);
    filter.timestamp = tsFilter;
  }

  const limit = Math.min(10000, Math.max(1, Number(limitStr) || 5000));
  const points = await VehicleTrajectory.find(filter)
    .sort({ timestamp: 1 })
    .limit(limit)
    .lean();

  res.json({ data: points, total: points.length });
}));

router.get('/trajectory/issues', asyncHandler(async (req, res) => {
  const { vin, run_id, task_id, project_id, start_time, end_time } = req.query;

  const issueFilter: Record<string, unknown> = {};

  if (vin) issueFilter.vehicle_vin = vin;

  if (run_id) {
    issueFilter.run_id = run_id;
  } else if (task_id) {
    issueFilter.task_id = task_id;
  } else if (project_id) {
    const { Task } = await import('@nvidopia/data-models');
    const taskIds = await Task.find({ project_id }).distinct('task_id');
    issueFilter.task_id = { $in: taskIds };
  }

  if (start_time || end_time) {
    const tsFilter: Record<string, unknown> = {};
    if (start_time) tsFilter.$gte = new Date(start_time as string);
    if (end_time) tsFilter.$lte = new Date(end_time as string);
    issueFilter.triggered_at = tsFilter;
  }

  const issues = await Issue.find(issueFilter)
    .select('issue_id category severity description vehicle_vin gps_coordinates triggered_at run_id task_id')
    .lean();

  res.json({
    data: issues.map((i) => ({
      issue_id: i.issue_id,
      category: i.category,
      severity: i.severity,
      description: (i.description ?? '').slice(0, 120),
      vehicle_vin: i.vehicle_vin,
      location: i.gps_coordinates,
      triggered_at: i.triggered_at,
      run_id: i.run_id,
      task_id: i.task_id,
    })),
    total: issues.length,
  });
}));

export default router;
