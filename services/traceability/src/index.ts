import { createServiceApp } from '@nvidopia/service-toolkit';
import traceRoutes from './routes/trace.js';

createServiceApp({
  name: 'traceability',
  port: parseInt(process.env.TRACEABILITY_PORT ?? '3004', 10),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/nvidopia',
  routes: (app) => {
    app.use('/api', traceRoutes);
  },
});
