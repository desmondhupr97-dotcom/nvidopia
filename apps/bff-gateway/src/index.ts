import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'node:crypto';

import { authMiddleware } from './middleware/auth.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import healthRouter from './routes/health.js';
import ingestRouter from './routes/ingest.js';
import proxyRouter from './routes/proxy.js';
import sseRouter from './routes/sse.js';
import { connectProducer, disconnectProducer } from './kafka.js';

const PORT = Number(process.env.GATEWAY_PORT) || 3000;
const app = express();

// --------------- Global middleware ---------------

app.use(cors());
app.use(helmet());
// NOTE: express.json() is intentionally NOT applied globally.
// It consumes the request body stream, which breaks http-proxy-middleware
// forwarding for POST/PUT. Body parsing is applied only to routes that
// need req.body (e.g. ingest routes).

// Trace-ID injection
app.use((req: Request, res: Response, next: NextFunction) => {
  const traceId = (req.headers['x-trace-id'] as string) ?? crypto.randomUUID();
  req.headers['x-trace-id'] = traceId;
  res.setHeader('x-trace-id', traceId);
  next();
});

app.use(rateLimitMiddleware);
app.use(authMiddleware);

// --------------- Routes ---------------

app.use(healthRouter);
app.use(ingestRouter);
app.use(sseRouter);
app.use(proxyRouter);

// --------------- Lifecycle ---------------

async function start(): Promise<void> {
  try {
    await connectProducer();
  } catch (err) {
    console.warn('[startup] Kafka producer connection failed – ingestion endpoints will error until Kafka is available', err);
  }

  app.listen(PORT, () => {
    console.log(`[bff-gateway] listening on :${PORT}`);
  });
}

async function shutdown(signal: string): Promise<void> {
  console.log(`[bff-gateway] received ${signal}, shutting down…`);
  await disconnectProducer();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
