import { Router } from 'express';
import { Vehicle, VehicleStatusSegment, VehicleTrajectory } from '@nvidopia/data-models';
import { createListHandler, asyncHandler } from '@nvidopia/service-toolkit';

const router = Router();

router.get('/vehicles', createListHandler(Vehicle, {
  allowedFilters: ['current_status', 'vehicle_platform', 'plate_type', 'model_code', 'driving_mode', 'soc_architecture'],
  defaultSort: { updated_at: -1 },
}));

router.get('/vehicles/:vin', asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findOne({ vin: req.params.vin });
  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }
  res.json(vehicle);
}));

router.put('/vehicles/:vin', asyncHandler(async (req, res) => {
  const allowedFields = ['plate_type', 'model_code', 'component_versions', 'vehicle_platform', 'sensor_suite_version', 'soc_architecture'];
  const update: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }

  const vehicle = await Vehicle.findOneAndUpdate(
    { vin: req.params.vin },
    { $set: update },
    { new: true, runValidators: true },
  );
  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }
  res.json(vehicle);
}));

router.get('/vehicles/:vin/status-distribution', asyncHandler(async (req, res) => {
  const { vin } = req.params;
  const { start_time, end_time } = req.query;

  const filter: Record<string, unknown> = { vin };
  if (start_time || end_time) {
    const tsFilter: Record<string, unknown> = {};
    if (start_time) tsFilter.$gte = new Date(start_time as string);
    if (end_time) tsFilter.$lte = new Date(end_time as string);
    filter.start_time = tsFilter;
  }

  const result = await VehicleStatusSegment.aggregate([
    { $match: filter },
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

router.get('/vehicles/:vin/trajectory', asyncHandler(async (req, res) => {
  const { vin } = req.params;
  const { start_time, end_time, run_id, limit: limitStr } = req.query;

  const filter: Record<string, unknown> = { vin };
  if (run_id) filter.run_id = run_id;
  if (start_time || end_time) {
    const tsFilter: Record<string, unknown> = {};
    if (start_time) tsFilter.$gte = new Date(start_time as string);
    if (end_time) tsFilter.$lte = new Date(end_time as string);
    filter.timestamp = tsFilter;
  }

  const limit = Math.min(10000, Math.max(1, Number(limitStr) || 5000));
  const points = await VehicleTrajectory.find(filter)
    .sort({ timestamp: 1 })
    .limit(limit)
    .lean();

  res.json({ data: points, total: points.length });
}));

export default router;
