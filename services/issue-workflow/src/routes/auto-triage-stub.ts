import { Router, type Request, type Response } from 'express';

const router = Router();

router.post('/issues/:id/auto-triage', (_req: Request, res: Response) => {
  res.status(501).json({
    message: 'Auto-triage not implemented. Reserved for future AI/rule-based triage.',
    status: 'reserved',
  });
});

router.get('/auto-triage/status', (_req: Request, res: Response) => {
  res.json({
    enabled: false,
    mode: 'manual_only',
    planned_features: ['rule_engine', 'ml_classifier'],
  });
});

export default router;
