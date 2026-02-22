import { createServiceApp } from '@nvidopia/service-toolkit';
import issueRoutes from './routes/issues.js';
import autoTriageStub from './routes/auto-triage-stub.js';
import { startIssueReportConsumer, stopIssueReportConsumer } from './consumers/issue-report.consumer.js';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');

createServiceApp({
  name: 'issue-workflow',
  port: parseInt(process.env.ISSUE_WORKFLOW_PORT ?? '3003', 10),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/nvidopia',
  routes: (app) => {
    app.use('/api', issueRoutes);
    app.use('/api', autoTriageStub);
  },
  onReady: async () => {
    await startIssueReportConsumer(KAFKA_BROKERS);
    console.log('[issue-workflow] Kafka consumer started');
  },
  cleanups: [stopIssueReportConsumer],
});
