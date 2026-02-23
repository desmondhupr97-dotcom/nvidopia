import { describe, it, expect } from 'vitest';
import './setup.js';
import { Vehicle, VehicleStatusSegment, Run } from '@nvidopia/data-models';

describe('Fleet Stats — distribution aggregation', () => {
  it('should aggregate by plate_type', async () => {
    await Vehicle.insertMany([
      { vin: 'V1', plate_type: 'permanent', current_status: 'Active' },
      { vin: 'V2', plate_type: 'permanent', current_status: 'Idle' },
      { vin: 'V3', plate_type: 'temporary', current_status: 'Active' },
    ]);

    const result = await Vehicle.aggregate([{ $group: { _id: '$plate_type', count: { $sum: 1 } } }]);
    const perm = result.find((r: any) => r._id === 'permanent');
    const temp = result.find((r: any) => r._id === 'temporary');
    expect(perm.count).toBe(2);
    expect(temp.count).toBe(1);
  });

  it('should aggregate by model_code', async () => {
    await Vehicle.insertMany([
      { vin: 'V1', model_code: 'EP32', current_status: 'Active' },
      { vin: 'V2', model_code: 'EP32', current_status: 'Idle' },
      { vin: 'V3', model_code: 'ES33', current_status: 'Active' },
    ]);

    const result = await Vehicle.aggregate([{ $group: { _id: '$model_code', count: { $sum: 1 } } }]);
    expect(result).toHaveLength(2);
  });

  it('should aggregate fleet-wide status distribution', async () => {
    await VehicleStatusSegment.insertMany([
      { vin: 'V1', driving_mode: 'Manual', start_time: new Date(), duration_ms: 1000, mileage_km: 1 },
      { vin: 'V2', driving_mode: 'Manual', start_time: new Date(), duration_ms: 2000, mileage_km: 2 },
      { vin: 'V1', driving_mode: 'LCC', start_time: new Date(), duration_ms: 3000, mileage_km: 5 },
    ]);

    const result = await VehicleStatusSegment.aggregate([
      { $group: { _id: '$driving_mode', total_duration_ms: { $sum: '$duration_ms' }, total_mileage_km: { $sum: '$mileage_km' } } },
    ]);

    const manual = result.find((r: any) => r._id === 'Manual');
    expect(manual.total_duration_ms).toBe(3000);
    expect(manual.total_mileage_km).toBe(3);
    const lcc = result.find((r: any) => r._id === 'LCC');
    expect(lcc.total_duration_ms).toBe(3000);
    expect(lcc.total_mileage_km).toBe(5);
  });

  it('should find active tasks per vehicle', async () => {
    await Run.insertMany([
      { run_id: 'R1', task_id: 'T1', vehicle_vin: 'V1', status: 'Active' },
      { run_id: 'R2', task_id: 'T2', vehicle_vin: 'V1', status: 'Active' },
      { run_id: 'R3', task_id: 'T1', vehicle_vin: 'V2', status: 'Completed' },
    ]);

    const activeRuns = await Run.find({ status: 'Active' }).lean();
    expect(activeRuns).toHaveLength(2);
    expect(activeRuns.every((r) => r.vehicle_vin === 'V1')).toBe(true);
  });
});
