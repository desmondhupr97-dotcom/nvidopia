import { Router, Request, Response } from 'express';
import { Task, TASK_STATUS, type TaskStatus } from '../models/task.model.js';
import { Project } from '../models/project.model.js';

const router = Router();

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus | null> = {
  Pending: 'InProgress',
  InProgress: 'Completed',
  Completed: null,
  Cancelled: null,
};

router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.project_id) filter.project_id = req.query.project_id;
    if (req.query.task_type) filter.task_type = req.query.task_type;
    if (req.query.status) filter.status = req.query.status;

    const tasks = await Task.find(filter).sort({ created_at: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list tasks', detail: String(err) });
  }
});

router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const { project_id } = req.body;
    if (project_id) {
      const project = await Project.findOne({ project_id });
      if (!project) {
        res.status(400).json({ error: `Project '${project_id}' does not exist` });
        return;
      }
    }

    const task = new Task(req.body);
    await task.save();
    res.status(201).json(task);
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ error: 'Duplicate task_id' });
      return;
    }
    res.status(400).json({ error: 'Failed to create task', detail: String(err) });
  }
});

router.get('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const task = await Task.findOne({ task_id: req.params.id });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get task', detail: String(err) });
  }
});

router.put('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const task = await Task.findOneAndUpdate(
      { task_id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update task', detail: String(err) });
  }
});

router.put('/tasks/:id/advance-stage', async (req: Request, res: Response) => {
  try {
    const task = await Task.findOne({ task_id: req.params.id });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const currentStatus = task.status as TaskStatus;
    const nextStatus = VALID_TRANSITIONS[currentStatus];

    if (!nextStatus) {
      res.status(400).json({
        error: `Cannot advance task from '${currentStatus}' — it is already terminal`,
      });
      return;
    }

    task.status = nextStatus;
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to advance task stage', detail: String(err) });
  }
});

export default router;
