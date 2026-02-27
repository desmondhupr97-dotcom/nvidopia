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

export default router;
