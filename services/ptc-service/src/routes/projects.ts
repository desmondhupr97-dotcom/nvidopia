import { Router, type Request, type Response } from 'express';
import { PtcProject, PtcTask, PtcBinding } from '@nvidopia/data-models';
import { asyncHandler } from '@nvidopia/service-toolkit';
import crypto from 'crypto';

const router = Router();

router.get('/projects', asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query;
  const filter: Record<string, unknown> = {};
  if (q && typeof q === 'string') {
    filter.name = { $regex: q, $options: 'i' };
  }
  const projects = await PtcProject.find(filter).sort({ updated_at: -1 }).lean();
  res.json(projects);
}));

router.post('/projects', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  try {
    const project = new PtcProject({
      project_id: `ptc-proj-${crypto.randomUUID().slice(0, 8)}`,
      name,
    });
    await project.save();
    res.status(201).json(project);
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ error: `Project '${name}' already exists` });
      return;
    }
    throw err;
  }
}));

router.get('/projects/:id', asyncHandler(async (req: Request, res: Response) => {
  const project = await PtcProject.findOne({ project_id: req.params.id }).lean();
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(project);
}));

router.put('/projects/:id', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;
  const project = await PtcProject.findOneAndUpdate(
    { project_id: req.params.id },
    { ...(name && { name }) },
    { new: true },
  ).lean();
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(project);
}));

router.delete('/projects/:id', asyncHandler(async (req: Request, res: Response) => {
  const project = await PtcProject.findOne({ project_id: req.params.id });
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const tasks = await PtcTask.find({ project_id: req.params.id });
  const taskIds = tasks.map((t) => t.task_id);
  if (taskIds.length > 0) {
    await PtcBinding.deleteMany({ task_id: { $in: taskIds } });
  }
  await PtcTask.deleteMany({ project_id: req.params.id });
  await PtcProject.deleteOne({ project_id: req.params.id });
  res.json({ deleted: true, cascaded: { tasks: taskIds.length } });
}));

export default router;
