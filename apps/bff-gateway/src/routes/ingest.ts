import { Router, Request, Response } from 'express';
import { getProducer } from '../kafka.js';

const router = Router();

router.post('/api/ingest/telemetry', async (req: Request, res: Response) => {
  const { vehicle_id, ...rest } = req.body ?? {};

  if (!vehicle_id) {
    res.status(400).json({ error: 'vehicle_id is required' });
    return;
  }

  await getProducer().send({
    topic: 'ad.telemetry.mileage.realtime',
    messages: [{ key: String(vehicle_id), value: JSON.stringify({ vehicle_id, ...rest, ingested_at: Date.now() }) }],
  });

  res.status(202).json({ accepted: true, topic: 'ad.telemetry.mileage.realtime' });
});

router.post('/api/ingest/status', async (req: Request, res: Response) => {
  const { vehicle_id, ...rest } = req.body ?? {};

  if (!vehicle_id) {
    res.status(400).json({ error: 'vehicle_id is required' });
    return;
  }

  await getProducer().send({
    topic: 'ad.vehicle.status.tracking',
    messages: [{ key: String(vehicle_id), value: JSON.stringify({ vehicle_id, ...rest, ingested_at: Date.now() }) }],
  });

  res.status(202).json({ accepted: true, topic: 'ad.vehicle.status.tracking' });
});

router.post('/api/ingest/issue', async (req: Request, res: Response) => {
  const body = req.body ?? {};

  if (!body.title && !body.description) {
    res.status(400).json({ error: 'title or description is required' });
    return;
  }

  await getProducer().send({
    topic: 'ad.testing.issue.reports',
    messages: [{ value: JSON.stringify({ ...body, ingested_at: Date.now() }) }],
  });

  res.status(202).json({ accepted: true, topic: 'ad.testing.issue.reports' });
});

export default router;
