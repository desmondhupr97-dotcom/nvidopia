import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from './logger.js';

declare global {
  namespace Express {
    interface Request {
      traceId: string;
      log: ReturnType<typeof createLogger>;
    }
  }
}

const baseLogger = createLogger('trace-middleware');

export function traceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const traceId = (req.headers['x-trace-id'] as string) || uuidv4();

  req.traceId = traceId;
  req.log = baseLogger.child({ traceId });

  res.setHeader('x-trace-id', traceId);

  next();
}
