import { Router, Request, Response } from 'express';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'bff-gateway',
    timestamp: new Date().toISOString(),
  });
});

export default router;
