import { createServiceApp } from '@nvidopia/service-toolkit';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';

createServiceApp({
  name: 'release-manager',
  port: Number(process.env.RELEASE_MANAGER_PORT) || 3001,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/nvidopia',
  routes: (app) => {
    app.use(projectRoutes);
    app.use(taskRoutes);
  },
});
