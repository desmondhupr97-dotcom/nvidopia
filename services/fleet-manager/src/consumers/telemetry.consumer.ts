import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { Run, Vehicle, VehicleTrajectory, VehicleStatusSegment } from '@nvidopia/data-models';

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
        const vehicleVin = payload.vehicle_vin || payload.vin || payload.vehicle_id;
        const mileageDelta = Number(payload.mileage_km ?? payload.delta_km ?? 0);
        const drivingMode = payload.driving_mode;
        const lat = payload.lat;
        const lng = payload.lng;
        const speedMps = Number(payload.speed_mps ?? 0);
        const headingDeg = payload.heading_deg;
        const ts = payload.timestamp ? new Date(payload.timestamp) : new Date();

        if (!vehicleVin) return;

        const activeRun = await Run.findOne({ vehicle_vin: vehicleVin, status: 'Active' });
        const runId = activeRun?._id?.toString();

        // 1. Write trajectory point
        if (lat != null && lng != null) {
          await VehicleTrajectory.create({
            vin: vehicleVin,
            run_id: runId,
            timestamp: ts,
            location: { lat, lng },
            speed_mps: speedMps,
            driving_mode: drivingMode || 'Manual',
            heading_deg: headingDeg,
          });
        }

        // 2. Update Vehicle real-time fields
        const vehicleUpdate: Record<string, unknown> = { last_heartbeat: ts };
        if (lat != null && lng != null) vehicleUpdate.current_location = { lat, lng };
        if (speedMps != null) vehicleUpdate.current_speed_mps = speedMps;
        if (drivingMode) vehicleUpdate.driving_mode = drivingMode;
        await Vehicle.findOneAndUpdate(
          { vin: vehicleVin },
          { $set: vehicleUpdate },
          { upsert: false },
        );

        // 3. Update Run mileage (backward compatible)
        if (activeRun && mileageDelta > 0) {
          await Run.updateOne(
            { _id: activeRun._id },
            { $inc: { total_auto_mileage_km: mileageDelta } },
          );
        }

        // 4. Detect driving_mode change → close old segment, open new one
        if (drivingMode) {
          const openSegment = await VehicleStatusSegment.findOne({
            vin: vehicleVin,
            end_time: null,
          }).sort({ start_time: -1 });

          if (openSegment && openSegment.driving_mode !== drivingMode) {
            const endTime = ts;
            const durationMs = endTime.getTime() - new Date(openSegment.start_time).getTime();
            await VehicleStatusSegment.updateOne(
              { _id: openSegment._id },
              { $set: { end_time: endTime, duration_ms: durationMs }, $inc: { mileage_km: mileageDelta } },
            );
            await VehicleStatusSegment.create({
              vin: vehicleVin,
              run_id: runId,
              driving_mode: drivingMode,
              start_time: ts,
              mileage_km: 0,
            });
          } else if (openSegment) {
            if (mileageDelta > 0) {
              await VehicleStatusSegment.updateOne(
                { _id: openSegment._id },
                { $inc: { mileage_km: mileageDelta } },
              );
            }
          } else {
            await VehicleStatusSegment.create({
              vin: vehicleVin,
              run_id: runId,
              driving_mode: drivingMode,
              start_time: ts,
              mileage_km: mileageDelta > 0 ? mileageDelta : 0,
            });
          }
        }
      } catch (err) {
        console.error('[telemetry-consumer] Error processing message:', err);
      }
    },
  });

  console.log(`[telemetry-consumer] Subscribed to ${TOPIC}`);
  return consumer;
}
