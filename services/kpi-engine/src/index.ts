import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import kpiRouter from './routes/kpi.js';
import { startKpiMetricsConsumer, stopKpiMetricsConsumer } from './consumers/kpi-metrics.consumer.js';

const PORT = parseInt(process.env.KPI_ENGINE_PORT || '3005', 10);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nvidopia';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'kpi-engine', timestamp: new Date().toISOString() });
});

app.use('/kpi', kpiRouter);

async function main(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[KPI Engine] Connected to MongoDB');
  } catch (err) {
    console.error('[KPI Engine] MongoDB connection error:', err);
    process.exit(1);
  }

  try {
    await startKpiMetricsConsumer(KAFKA_BROKERS);
    console.log('[KPI Engine] Kafka consumer started');
  } catch (err) {
    console.warn('[KPI Engine] Kafka consumer failed to start (will operate without real-time ingestion):', err);
  }

  app.listen(PORT, () => {
    console.log(`[KPI Engine] Listening on port ${PORT}`);
  });
}

async function shutdown(): Promise<void> {
  console.log('[KPI Engine] Shutting down...');
  await stopKpiMetricsConsumer();
  await mongoose.disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main();
