import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import issueRoutes from './routes/issues.js';
import autoTriageStub from './routes/auto-triage-stub.js';
import { startIssueReportConsumer } from './consumers/issue-report.consumer.js';

const PORT = parseInt(process.env.ISSUE_WORKFLOW_PORT ?? '3003', 10);
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/nvidopia';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    service: 'issue-workflow',
    status: 'ok',
    uptime: process.uptime(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use('/api', issueRoutes);
app.use('/api', autoTriageStub);

async function bootstrap(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`[issue-workflow] MongoDB connected: ${MONGO_URI}`);
  } catch (err) {
    console.error('[issue-workflow] MongoDB connection failed:', err);
    process.exit(1);
  }

  try {
    await startIssueReportConsumer(KAFKA_BROKERS);
    console.log('[issue-workflow] Kafka consumer started');
  } catch (err) {
    console.warn('[issue-workflow] Kafka consumer failed to start (will run without it):', err instanceof Error ? err.message : err);
  }

  app.listen(PORT, () => {
    console.log(`[issue-workflow] Service running on http://localhost:${PORT}`);
  });
}

bootstrap();
