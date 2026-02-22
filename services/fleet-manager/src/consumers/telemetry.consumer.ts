import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { Run } from '../models/run.model.js';

const TOPIC = 'ad.telemetry.mileage.realtime';
const GROUP_ID = 'fleet-manager-telemetry';

export async function startTelemetryConsumer(kafka: Kafka): Promise<Consumer> {
  const consumer = kafka.consumer({ groupId: GROUP_ID });
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }: EachMessagePayload) => {
      if (!message.value) return;

      try {
        const payload = JSON.parse(message.value.toString());

        const vehicleVin = payload.vehicle_vin || payload.vin;
        const mileageDelta = Number(payload.mileage_km ?? payload.delta_km ?? 0);

        if (!vehicleVin || mileageDelta <= 0) return;

        const activeRun = await Run.findOne({
          vehicle_vin: vehicleVin,
          status: 'Active',
        });

        if (!activeRun) return;

        await Run.updateOne(
          { _id: activeRun._id },
          { $inc: { total_auto_mileage_km: mileageDelta } },
        );
      } catch (err) {
        console.error('[telemetry-consumer] Error processing message:', err);
      }
    },
  });

  console.log(`[telemetry-consumer] Subscribed to ${TOPIC}`);
  return consumer;
}
