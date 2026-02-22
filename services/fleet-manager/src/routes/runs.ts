import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Run, type RunStatus, RUN_STATUS } from '../models/run.model.js';
import { Task } from '../models/task.model.js';
import { Vehicle } from '../models/vehicle.model.js';
import { Project } from '../models/project.model.js';

const router = Router();

const VALID_TRANSITIONS: Record<RunStatus, RunStatus[]> = {
  Scheduled: ['Active', 'Aborted'],
  Active: ['Completed', 'Aborted'],
  Completed: [],
  Aborted: [],
};

router.get('/runs', async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.task_id) filter.task_id = req.query.task_id;
    if (req.query.vehicle_vin) filter.vehicle_vin = req.query.vehicle_vin;
    if (req.query.status) filter.status = req.query.status;

    const runs = await Run.find(filter).sort({ created_at: -1 });
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list runs', detail: String(err) });
  }
});

router.post('/runs', async (req: Request, res: Response) => {
  try {
    const run = new Run(req.body);
    await run.save();
    res.status(201).json(run);
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ error: 'Duplicate run_id' });
      return;
    }
    res.status(400).json({ error: 'Failed to create run', detail: String(err) });
  }
});

router.get('/runs/:id', async (req: Request, res: Response) => {
  try {
    const run = await Run.findOne({ run_id: req.params.id });
    if (!run) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get run', detail: String(err) });
  }
});

router.put('/runs/:id', async (req: Request, res: Response) => {
  try {
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
  } catch (err) {
    res.status(400).json({ error: 'Failed to update run', detail: String(err) });
  }
});

router.post('/tasks/:id/assign-vehicles', async (req: Request, res: Response) => {
  try {
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

    const vehicleFilter: Record<string, unknown> = {
      current_status: 'Idle',
      vehicle_platform: project.vehicle_platform,
      sensor_suite_version: project.sensor_suite_version,
    };

    const matchedVehicles = await Vehicle.find(vehicleFilter);

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
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign vehicles', detail: String(err) });
  }
});

export default router;
