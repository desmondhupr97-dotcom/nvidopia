import { createServiceApp } from '@nvidopia/service-toolkit';
import simulationRoutes from './routes/simulations.js';

createServiceApp({
  name: 'fleet-simulator',
  port: Number(process.env.FLEET_SIMULATOR_PORT) || 3006,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/nvidopia',
  routes: (app) => {
    app.use(simulationRoutes);
  },
});
