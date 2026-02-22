import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { KpiSnapshot } from '@nvidopia/data-models';

const TOPIC = 'ad.testing.kpi.metrics';
const GROUP_ID = 'kpi-engine-metrics';
const MAX_RETRIES = 3;

let consumer: Consumer | null = null;

export async function startKpiMetricsConsumer(brokers: string[]): Promise<void> {
  const kafka = new Kafka({
    clientId: 'kpi-engine',
    brokers,
    retry: { retries: MAX_RETRIES },
  });

  consumer = kafka.consumer({ groupId: GROUP_ID });

  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: false });

  await consumer.run({
    eachMessage: async (payload: EachMessagePayload) => {
      await handleMessage(payload);
    },
  });

  console.log(`[KPI Consumer] Subscribed to ${TOPIC}`);
}

async function handleMessage({ message }: EachMessagePayload): Promise<void> {
  if (!message.value) return;

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const data = JSON.parse(message.value.toString());

      await KpiSnapshot.findOneAndUpdate(
        {
          metric_name: data.metric_name,
          project_id: data.project_id,
          window_start: data.window_start,
          window_end: data.window_end,
        },
        {
          $set: {
            snapshot_id: data.snapshot_id,
            metric_name: data.metric_name,
            project_id: data.project_id,
            task_id: data.task_id,
            value: data.value,
            unit: data.unit,
            window_start: data.window_start,
            window_end: data.window_end,
            dimensions: data.dimensions,
            created_at: data.created_at ?? new Date(),
          },
        },
        { upsert: true, new: true },
      );

      return;
    } catch (err) {
      attempt++;
      console.error(`[KPI Consumer] Error processing message (attempt ${attempt}/${MAX_RETRIES}):`, err);
      if (attempt >= MAX_RETRIES) {
        console.error('[KPI Consumer] Max retries reached, skipping message');
      }
    }
  }
}

export async function stopKpiMetricsConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
    console.log('[KPI Consumer] Disconnected');
  }
}
