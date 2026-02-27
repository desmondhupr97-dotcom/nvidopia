import { createServiceApp } from '@nvidopia/service-toolkit';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import bindingRoutes from './routes/bindings.js';
import metaRoutes from './routes/meta.js';
import overviewRoutes from './routes/overview.js';

createServiceApp({
  name: 'ptc-service',
  port: Number(process.env.PTC_SERVICE_PORT) || 3007,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/nvidopia',
  routes: (app) => {
    app.use(projectRoutes);
    app.use(taskRoutes);
    app.use(bindingRoutes);
    app.use(metaRoutes);
    app.use(overviewRoutes);
  },
});
