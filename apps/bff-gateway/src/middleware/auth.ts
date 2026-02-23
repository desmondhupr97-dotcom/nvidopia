import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOW_ANONYMOUS = process.env.ALLOW_ANONYMOUS === 'true' || !IS_PRODUCTION;

const WHITELIST: RegExp[] = [
  /^\/health$/,
  /^\/api\/ingest\//,
];

function isWhitelisted(path: string): boolean {
  return WHITELIST.some((re) => re.test(path));
}

export interface AuthenticatedRequest extends Request {
  user?: jwt.JwtPayload | string;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (isWhitelisted(req.path)) {
    next();
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    if (ALLOW_ANONYMOUS) {
      req.user = { role: 'anonymous' };
      next();
      return;
    }
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
