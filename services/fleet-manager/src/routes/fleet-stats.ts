import { Router } from 'express';
import { Vehicle, VehicleStatusSegment, Run } from '@nvidopia/data-models';
import { asyncHandler } from '@nvidopia/service-toolkit';

const router = Router();

router.get('/fleet/distribution', asyncHandler(async (_req, res) => {
  const [byPlateType, byModelCode, bySocArch, byDrivingMode, byStatus] = await Promise.all([
    Vehicle.aggregate([{ $group: { _id: '$plate_type', count: { $sum: 1 } } }]),
    Vehicle.aggregate([{ $group: { _id: '$model_code', count: { $sum: 1 } } }]),
    Vehicle.aggregate([{ $group: { _id: '$soc_architecture', count: { $sum: 1 } } }]),
    Vehicle.aggregate([{ $group: { _id: '$driving_mode', count: { $sum: 1 } } }]),
    Vehicle.aggregate([{ $group: { _id: '$current_status', count: { $sum: 1 } } }]),
  ]);

  res.json({
    plate_type: byPlateType.map((d) => ({ name: d._id ?? 'unknown', count: d.count })),
    model_code: byModelCode.map((d) => ({ name: d._id ?? 'unknown', count: d.count })),
    soc_architecture: bySocArch.map((d) => ({ name: d._id ?? 'unknown', count: d.count })),
    driving_mode: byDrivingMode.map((d) => ({ name: d._id ?? 'unknown', count: d.count })),
    current_status: byStatus.map((d) => ({ name: d._id ?? 'unknown', count: d.count })),
  });
}));

router.get('/fleet/status-distribution', asyncHandler(async (_req, res) => {
  const result = await VehicleStatusSegment.aggregate([
    {
      $group: {
        _id: '$driving_mode',
        total_duration_ms: { $sum: '$duration_ms' },
        total_mileage_km: { $sum: '$mileage_km' },
        segment_count: { $sum: 1 },
      },
    },
    { $sort: { total_duration_ms: -1 } },
  ]);

  res.json(result.map((d) => ({
    driving_mode: d._id,
    total_duration_ms: d.total_duration_ms ?? 0,
    total_mileage_km: d.total_mileage_km ?? 0,
    segment_count: d.segment_count,
  })));
}));

router.get('/fleet/active-tasks', asyncHandler(async (_req, res) => {
  const activeRuns = await Run.find({ status: 'Active' }).lean();
  const grouped: Record<string, { vin: string; run_id: string; task_id: string }[]> = {};

  for (const run of activeRuns) {
    const vin = run.vehicle_vin;
    if (!grouped[vin]) grouped[vin] = [];
    grouped[vin].push({ vin, run_id: run.run_id, task_id: run.task_id });
  }

  res.json(grouped);
}));

export default router;
