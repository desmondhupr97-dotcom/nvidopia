import { Router, Request, Response } from 'express';
import { Project } from '../models/project.model.js';

const router = Router();

router.get('/projects', async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.vehicle_platform) filter.vehicle_platform = req.query.vehicle_platform;

    const projects = await Project.find(filter).sort({ created_at: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list projects', detail: String(err) });
  }
});

router.post('/projects', async (req: Request, res: Response) => {
  try {
    const project = new Project(req.body);
    await project.save();
    res.status(201).json(project);
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ error: 'Duplicate project_id' });
      return;
    }
    res.status(400).json({ error: 'Failed to create project', detail: String(err) });
  }
});

router.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const project = await Project.findOne({ project_id: req.params.id });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get project', detail: String(err) });
  }
});

router.put('/projects/:id', async (req: Request, res: Response) => {
  try {
    const project = await Project.findOneAndUpdate(
      { project_id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update project', detail: String(err) });
  }
});

export default router;
