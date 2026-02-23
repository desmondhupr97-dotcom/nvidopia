import { Router, Request, Response } from 'express';
import express from 'express';
import { getProducer } from '../kafka.js';

const router = Router();
const jsonParser = express.json({ limit: '1mb' });

function createIngestHandler(
  topic: string,
  keyExtractor: (body: Record<string, unknown>) => string | null,
  validator: (body: Record<string, unknown>) => string | null,
) {
  return async (req: Request, res: Response) => {
    const body = req.body ?? {};

    const validationError = validator(body);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const key = keyExtractor(body);

    try {
      const producer = getProducer();
      await producer.send({
        topic,
        messages: [{
          key: key ? String(key) : undefined,
          value: JSON.stringify({ ...body, ingested_at: Date.now() }),
        }],
      });
      res.status(202).json({ accepted: true, topic });
    } catch {
      res.status(503).json({ error: 'Kafka unavailable – ingestion is offline' });
    }
  };
}

router.post('/api/ingest/telemetry', jsonParser, createIngestHandler(
  'ad.telemetry.mileage.realtime',
  (body) => String(body.vehicle_id ?? ''),
  (body) => body.vehicle_id ? null : 'vehicle_id is required',
));

router.post('/api/ingest/status', jsonParser, createIngestHandler(
  'ad.vehicle.status.tracking',
  (body) => String(body.vehicle_id ?? ''),
  (body) => body.vehicle_id ? null : 'vehicle_id is required',
));

router.post('/api/ingest/issue', jsonParser, createIngestHandler(
  'ad.testing.issue.reports',
  () => null,
  (body) => (body.title || body.description) ? null : 'title or description is required',
));

export default router;
