import { Router } from 'express';
import { Project } from '@nvidopia/data-models';
import { createListHandler, createGetByIdHandler, createDocHandler, createUpdateHandler } from '@nvidopia/service-toolkit';

const router = Router();

router.get('/projects', createListHandler(Project, {
  allowedFilters: ['status', 'vehicle_platform'],
}));

router.post('/projects', createDocHandler(Project, 'project_id'));

router.get('/projects/:id', createGetByIdHandler(Project, 'project_id', 'Project'));

router.put('/projects/:id', createUpdateHandler(Project, 'project_id', 'Project'));

export default router;
