import { createServiceApp } from '@nvidopia/service-toolkit';
import { Kafka } from 'kafkajs';
import vehicleRoutes from './routes/vehicles.js';
import runRoutes from './routes/runs.js';
import fleetStatsRoutes from './routes/fleet-stats.js';
import trajectoryRoutes from './routes/trajectory.js';
import { startVehicleStatusConsumer } from './consumers/vehicle-status.consumer.js';
import { startTelemetryConsumer } from './consumers/telemetry.consumer.js';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

let telemetryConsumer: any;
let statusConsumer: any;

createServiceApp({
  name: 'fleet-manager',
  port: Number(process.env.FLEET_MANAGER_PORT) || 3002,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/nvidopia',
  routes: (app) => {
    app.use(vehicleRoutes);
    app.use(runRoutes);
    app.use(fleetStatsRoutes);
    app.use(trajectoryRoutes);
  },
  onReady: async () => {
    const kafka = new Kafka({ clientId: 'fleet-manager', brokers: KAFKA_BROKERS });
    statusConsumer = await startVehicleStatusConsumer(kafka);
    telemetryConsumer = await startTelemetryConsumer(kafka);
    console.log('[fleet-manager] Kafka consumers started');
  },
  cleanups: [
    async () => { if (telemetryConsumer) await telemetryConsumer.disconnect(); },
    async () => { if (statusConsumer) await statusConsumer.disconnect(); },
  ],
});
