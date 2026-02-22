import { createServiceApp } from '@nvidopia/service-toolkit';
import kpiRouter from './routes/kpi.js';
import schemaRegistryRouter from './routes/schema-registry.js';
import customKpiRouter from './routes/custom-kpi.js';
import { startKpiMetricsConsumer, stopKpiMetricsConsumer } from './consumers/kpi-metrics.consumer.js';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

createServiceApp({
  name: 'kpi-engine',
  port: parseInt(process.env.KPI_ENGINE_PORT || '3005', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/nvidopia',
  routes: (app) => {
    app.use('/kpi', kpiRouter);
    app.use('/kpi', customKpiRouter);
    app.use('/schema', schemaRegistryRouter);
  },
  onReady: async () => {
    await startKpiMetricsConsumer(KAFKA_BROKERS);
    console.log('[kpi-engine] Kafka consumer started');
  },
  cleanups: [stopKpiMetricsConsumer],
});
