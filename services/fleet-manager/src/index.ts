import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { Kafka } from 'kafkajs';
import vehicleRoutes from './routes/vehicles.js';
import runRoutes from './routes/runs.js';
import { startVehicleStatusConsumer } from './consumers/vehicle-status.consumer.js';
import { startTelemetryConsumer } from './consumers/telemetry.consumer.js';

const PORT = Number(process.env.FLEET_MANAGER_PORT) || 3002;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nvidopia';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'fleet-manager', timestamp: new Date().toISOString() });
});

app.use(vehicleRoutes);
app.use(runRoutes);

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('[fleet-manager] Connected to MongoDB');

  const kafka = new Kafka({
    clientId: 'fleet-manager',
    brokers: KAFKA_BROKERS,
  });

  try {
    await startVehicleStatusConsumer(kafka);
    await startTelemetryConsumer(kafka);
    console.log('[fleet-manager] Kafka consumers started');
  } catch (err) {
    console.warn('[fleet-manager] Kafka consumers failed to start (Kafka may be unavailable):', err);
  }

  app.listen(PORT, () => {
    console.log(`[fleet-manager] Listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('[fleet-manager] Fatal startup error:', err);
  process.exit(1);
});
