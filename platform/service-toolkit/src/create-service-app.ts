import 'dotenv/config';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

export interface ServiceConfig {
  name: string;
  port: number;
  mongoUri: string;
  routes: (app: Express) => void;
  /** Async work to run after MongoDB connects (e.g. start Kafka consumers). Failures are non-fatal. */
  onReady?: () => Promise<void>;
  /** Cleanup callbacks invoked on SIGINT/SIGTERM before process exits. */
  cleanups?: Array<() => Promise<void>>;
}

export function createServiceApp(config: ServiceConfig): void {
  const { name, port, mongoUri, routes, onReady, cleanups = [] } = config;
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      service: name,
      status: 'ok',
      uptime: process.uptime(),
      mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  });

  routes(app);

  app.use(errorMiddleware);

  async function bootstrap(): Promise<void> {
    try {
      await mongoose.connect(mongoUri);
      console.log(`[${name}] Connected to MongoDB`);
    } catch (err) {
      console.error(`[${name}] MongoDB connection failed:`, err);
      process.exit(1);
    }

    if (onReady) {
      try {
        await onReady();
      } catch (err) {
        console.warn(`[${name}] onReady hook failed (non-fatal):`, err instanceof Error ? err.message : err);
      }
    }

    app.listen(port, () => {
      console.log(`[${name}] Listening on port ${port}`);
    });
  }

  async function shutdown(signal: string): Promise<void> {
    console.log(`[${name}] Received ${signal}, shutting down...`);
    for (const fn of cleanups) {
      try { await fn(); } catch { /* best-effort */ }
    }
    await mongoose.disconnect();
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  bootstrap();
}

function errorMiddleware(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
  console.error(`[error] ${err.message}`);
  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal server error' : err.message,
  });
}
