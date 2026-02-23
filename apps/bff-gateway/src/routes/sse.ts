import { Router, type Request, type Response } from 'express';
import { kafka } from '../kafka.js';
import type { Consumer } from 'kafkajs';

const router = Router();

const TOPIC = 'ad.vehicle.status.tracking';
const GROUP_ID = 'bff-sse-vehicles';

interface SSEClient {
  id: string;
  res: Response;
  vinFilter: Set<string> | null;
}

const clients: Map<string, SSEClient> = new Map();

let consumer: Consumer | null = null;
let consumerStarted = false;

async function ensureConsumer(): Promise<void> {
  if (consumerStarted) return;
  consumerStarted = true;

  try {
    consumer = kafka.consumer({ groupId: GROUP_ID });
    await consumer.connect();
    await consumer.subscribe({ topic: TOPIC, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        try {
          const payload = JSON.parse(message.value.toString());
          const vin = payload.vin || payload.vehicle_id;
          if (!vin) return;

          const eventData = JSON.stringify({ ...payload, vin });

          for (const client of clients.values()) {
            if (client.vinFilter && !client.vinFilter.has(vin)) continue;
            client.res.write(`data: ${eventData}\n\n`);
          }
        } catch {
          // skip malformed messages
        }
      },
    });

    console.log(`[sse] Kafka consumer subscribed to ${TOPIC}`);
  } catch (err) {
    console.error('[sse] Failed to start Kafka consumer:', err);
    consumerStarted = false;
  }
}

router.get('/api/sse/vehicles', async (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(':ok\n\n');

  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const vinsParam = req.query.vins as string | undefined;
  const vinFilter = vinsParam ? new Set(vinsParam.split(',').map((v) => v.trim())) : null;

  clients.set(clientId, { id: clientId, res, vinFilter });

  await ensureConsumer();

  const keepAlive = setInterval(() => {
    res.write(':ping\n\n');
  }, 30_000);

  req.on('close', () => {
    clearInterval(keepAlive);
    clients.delete(clientId);
  });
});

export default router;
