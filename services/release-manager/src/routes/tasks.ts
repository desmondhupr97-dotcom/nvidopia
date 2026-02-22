import { Router, type Request, type Response } from 'express';
import { Task, Project, type TaskStatus } from '@nvidopia/data-models';
import { createListHandler, createGetByIdHandler, createUpdateHandler, asyncHandler } from '@nvidopia/service-toolkit';

const router = Router();

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus | null> = {
  Pending: 'InProgress',
  InProgress: 'Completed',
  Completed: null,
  Cancelled: null,
};

router.get('/tasks', createListHandler(Task, {
  allowedFilters: ['project_id', 'task_type', 'status'],
}));

router.post('/tasks', asyncHandler(async (req: Request, res: Response) => {
  const { project_id } = req.body;
  if (project_id) {
    const project = await Project.findOne({ project_id });
    if (!project) {
      res.status(400).json({ error: `Project '${project_id}' does not exist` });
      return;
    }
  }
  try {
    const task = new Task(req.body);
    await task.save();
    res.status(201).json(task);
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ error: 'Duplicate task_id' });
      return;
    }
    throw err;
  }
}));

router.get('/tasks/:id', createGetByIdHandler(Task, 'task_id', 'Task'));

router.put('/tasks/:id', createUpdateHandler(Task, 'task_id', 'Task'));

router.put('/tasks/:id/advance-stage', asyncHandler(async (req: Request, res: Response) => {
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
}));

export default router;
