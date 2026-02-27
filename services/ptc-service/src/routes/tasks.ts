import { Router, type Request, type Response } from 'express';
import { PtcProject, PtcTask, PtcBinding } from '@nvidopia/data-models';
import { asyncHandler } from '@nvidopia/service-toolkit';
import crypto from 'crypto';

const router = Router();

router.get('/tasks', asyncHandler(async (req: Request, res: Response) => {
  const { q, project_id } = req.query;
  const filter: Record<string, unknown> = {};
  if (q && typeof q === 'string') {
    filter.name = { $regex: q, $options: 'i' };
  }
  if (project_id && typeof project_id === 'string') {
    filter.project_id = project_id;
  }
  const tasks = await PtcTask.find(filter).sort({ updated_at: -1 }).lean();
  res.json(tasks);
}));

router.post('/tasks', asyncHandler(async (req: Request, res: Response) => {
  const { name, project_id, project_name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  let resolvedProjectId = project_id;

  if (!resolvedProjectId && project_name) {
    let project = await PtcProject.findOne({ name: project_name });
    if (!project) {
      project = new PtcProject({
        project_id: `ptc-proj-${crypto.randomUUID().slice(0, 8)}`,
        name: project_name,
      });
      await project.save();
    }
    resolvedProjectId = project.project_id;
  }

  if (!resolvedProjectId) {
    res.status(400).json({ error: 'project_id or project_name is required' });
    return;
  }

  const projectExists = await PtcProject.findOne({ project_id: resolvedProjectId });
  if (!projectExists) {
    res.status(400).json({ error: `Project '${resolvedProjectId}' does not exist` });
    return;
  }

  try {
    const task = new PtcTask({
      task_id: `ptc-task-${crypto.randomUUID().slice(0, 8)}`,
      project_id: resolvedProjectId,
      name,
    });
    await task.save();
    res.status(201).json(task);
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ error: `Task '${name}' already exists in this project` });
      return;
    }
    throw err;
  }
}));

router.get('/tasks/:id', asyncHandler(async (req: Request, res: Response) => {
  const task = await PtcTask.findOne({ task_id: req.params.id }).lean();
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json(task);
}));

router.put('/tasks/:id', asyncHandler(async (req: Request, res: Response) => {
  const { name, project_id } = req.body;
  const updates: Record<string, unknown> = {};
  if (name) updates.name = name;
  if (project_id) {
    const projectExists = await PtcProject.findOne({ project_id });
    if (!projectExists) {
      res.status(400).json({ error: `Project '${project_id}' does not exist` });
      return;
    }
    updates.project_id = project_id;
  }
  const task = await PtcTask.findOneAndUpdate(
    { task_id: req.params.id },
    updates,
    { new: true },
  ).lean();
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json(task);
}));

router.delete('/tasks/:id', asyncHandler(async (req: Request, res: Response) => {
  const task = await PtcTask.findOne({ task_id: req.params.id });
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  await PtcBinding.deleteMany({ task_id: req.params.id });
  await PtcTask.deleteOne({ task_id: req.params.id });
  res.json({ deleted: true });
}));

export default router;
