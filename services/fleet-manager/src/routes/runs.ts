import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Run, Task, Vehicle, Project, type RunStatus } from '@nvidopia/data-models';
import { createListHandler, createGetByIdHandler, createDocHandler, asyncHandler } from '@nvidopia/service-toolkit';

const router = Router();

const VALID_TRANSITIONS: Record<RunStatus, RunStatus[]> = {
  Scheduled: ['Active', 'Aborted'],
  Active: ['Completed', 'Aborted'],
  Completed: [],
  Aborted: [],
};

router.get('/runs', createListHandler(Run, {
  allowedFilters: ['task_id', 'vehicle_vin', 'status'],
}));

router.post('/runs', createDocHandler(Run, 'run_id'));

router.get('/runs/:id', createGetByIdHandler(Run, 'run_id', 'Run'));

router.put('/runs/:id', asyncHandler(async (req: Request, res: Response) => {
  const run = await Run.findOne({ run_id: req.params.id });
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  if (req.body.status && req.body.status !== run.status) {
    const allowed = VALID_TRANSITIONS[run.status as RunStatus];
    if (!allowed.includes(req.body.status)) {
      res.status(400).json({
        error: `Invalid status transition from '${run.status}' to '${req.body.status}'`,
      });
      return;
    }
  }

  Object.assign(run, req.body);
  await run.save();
  res.json(run);
}));

router.post('/tasks/:id/assign-vehicles', asyncHandler(async (req: Request, res: Response) => {
  const task = await Task.findOne({ task_id: req.params.id });
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const project = await Project.findOne({ project_id: task.project_id });
  if (!project) {
    res.status(404).json({ error: `Project '${task.project_id}' not found` });
    return;
  }

  const matchedVehicles = await Vehicle.find({
    current_status: 'Idle',
    vehicle_platform: project.vehicle_platform,
    sensor_suite_version: project.sensor_suite_version,
  });

  if (matchedVehicles.length === 0) {
    res.json({ task_id: task.task_id, matched: 0, runs: [] });
    return;
  }

  const runs = await Promise.all(
    matchedVehicles.map(async (vehicle) => {
      const run = new Run({
        run_id: `run-${randomUUID()}`,
        task_id: task.task_id,
        vehicle_vin: vehicle.vin,
        status: 'Scheduled',
      });
      await run.save();
      return run;
    }),
  );

  res.status(201).json({ task_id: task.task_id, matched: runs.length, runs });
}));

export default router;
