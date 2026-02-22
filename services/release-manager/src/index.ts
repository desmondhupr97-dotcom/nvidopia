import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';

const PORT = Number(process.env.RELEASE_MANAGER_PORT) || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nvidopia';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'release-manager', timestamp: new Date().toISOString() });
});

app.use(projectRoutes);
app.use(taskRoutes);

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('[release-manager] Connected to MongoDB');

  app.listen(PORT, () => {
    console.log(`[release-manager] Listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('[release-manager] Fatal startup error:', err);
  process.exit(1);
});
