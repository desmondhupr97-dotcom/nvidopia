import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { Vehicle } from '../models/vehicle.model.js';

const TOPIC = 'ad.vehicle.status.tracking';
const GROUP_ID = 'fleet-manager-status';

export async function startVehicleStatusConsumer(kafka: Kafka): Promise<Consumer> {
  const consumer = kafka.consumer({ groupId: GROUP_ID });
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }: EachMessagePayload) => {
      if (!message.value) return;

      try {
        const payload = JSON.parse(message.value.toString());

        const update: Record<string, unknown> = {};
        if (payload.current_status) update.current_status = payload.current_status;
        if (payload.current_location) update.current_location = payload.current_location;
        if (payload.fuel_or_battery_level != null) update.fuel_or_battery_level = payload.fuel_or_battery_level;
        if (payload.driving_mode) update.driving_mode = payload.driving_mode;
        if (payload.vehicle_platform) update.vehicle_platform = payload.vehicle_platform;
        if (payload.sensor_suite_version) update.sensor_suite_version = payload.sensor_suite_version;
        if (payload.soc_architecture) update.soc_architecture = payload.soc_architecture;
        update.last_heartbeat = payload.last_heartbeat ?? new Date();

        const vin = payload.vin || payload.vehicle_id;
        if (!vin) {
          console.warn('[vehicle-status-consumer] Message missing vin/vehicle_id, skipping');
          return;
        }

        await Vehicle.findOneAndUpdate(
          { vin },
          { $set: update },
          { upsert: true, new: true },
        );
      } catch (err) {
        console.error('[vehicle-status-consumer] Error processing message:', err);
      }
    },
  });

  console.log(`[vehicle-status-consumer] Subscribed to ${TOPIC}`);
  return consumer;
}
