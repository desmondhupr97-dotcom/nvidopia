import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import traceRoutes from './routes/trace.js';

const PORT = parseInt(process.env.TRACEABILITY_PORT ?? '3004', 10);
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/nvidopia';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    service: 'traceability',
    status: 'ok',
    uptime: process.uptime(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use('/api', traceRoutes);

async function bootstrap(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`[traceability] MongoDB connected: ${MONGO_URI}`);
  } catch (err) {
    console.error('[traceability] MongoDB connection failed:', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[traceability] Service running on http://localhost:${PORT}`);
  });
}

bootstrap();
