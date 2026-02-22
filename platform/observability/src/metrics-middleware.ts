import { Request, Response, NextFunction, Router } from 'express';

interface RequestCount {
  method: string;
  path: string;
  statusCode: number;
  count: number;
}

interface DurationBucket {
  method: string;
  path: string;
  le: number;
  count: number;
}

const HISTOGRAM_BUCKETS = [10, 50, 100, 250, 500, 1000, 2500, 5000, Infinity];

const requestCounts = new Map<string, RequestCount>();
const durationBuckets = new Map<string, DurationBucket>();

function counterKey(method: string, path: string, statusCode: number): string {
  return `${method}|${path}|${statusCode}`;
}

function bucketKey(method: string, path: string, le: number): string {
  return `${method}|${path}|${le}`;
}

function normalizePath(path: string): string {
  return path.replace(/\/[0-9a-fA-F]{24}/g, '/:id').replace(/\/\d+/g, '/:id');
}

function recordRequest(method: string, rawPath: string, statusCode: number, durationMs: number): void {
  const path = normalizePath(rawPath);

  const ck = counterKey(method, path, statusCode);
  const existing = requestCounts.get(ck);
  if (existing) {
    existing.count++;
  } else {
    requestCounts.set(ck, { method, path, statusCode, count: 1 });
  }

  for (const le of HISTOGRAM_BUCKETS) {
    if (durationMs <= le) {
      const bk = bucketKey(method, path, le);
      const bucket = durationBuckets.get(bk);
      if (bucket) {
        bucket.count++;
      } else {
        durationBuckets.set(bk, { method, path, le, count: 1 });
      }
    }
  }
}

function renderMetrics(): string {
  const lines: string[] = [];

  lines.push('# HELP http_requests_total Total number of HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  for (const entry of requestCounts.values()) {
    lines.push(
      `http_requests_total{method="${entry.method}",path="${entry.path}",status_code="${entry.statusCode}"} ${entry.count}`,
    );
  }

  lines.push('');
  lines.push('# HELP http_request_duration_ms HTTP request duration in milliseconds');
  lines.push('# TYPE http_request_duration_ms histogram');
  for (const entry of durationBuckets.values()) {
    const leLabel = entry.le === Infinity ? '+Inf' : String(entry.le);
    lines.push(
      `http_request_duration_ms_bucket{method="${entry.method}",path="${entry.path}",le="${leLabel}"} ${entry.count}`,
    );
  }

  return lines.join('\n') + '\n';
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    if (req.path === '/metrics') return;
    const durationMs = Date.now() - start;
    recordRequest(req.method, req.path, res.statusCode, durationMs);
  });

  next();
}

export function metricsRouter(): Router {
  const router = Router();
  router.get('/metrics', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(renderMetrics());
  });
  return router;
}
