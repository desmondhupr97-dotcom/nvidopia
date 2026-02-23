import { describe, it, expect } from 'vitest';
import './setup.js';
import { VehicleTrajectory, VehicleStatusSegment, Vehicle } from '@nvidopia/data-models';

describe('VehicleTrajectory Model', () => {
  it('should create and query trajectory points', async () => {
    const points = Array.from({ length: 10 }, (_, i) => ({
      vin: 'VIN-TEST-001',
      run_id: 'RUN-T1',
      timestamp: new Date(Date.now() - (10 - i) * 1000),
      location: { lat: 31.23 + i * 0.001, lng: 121.47 + i * 0.001 },
      speed_mps: 10 + i,
      driving_mode: i < 5 ? 'Manual' : 'LCC',
      heading_deg: i * 36,
    }));

    await VehicleTrajectory.insertMany(points);
    const stored = await VehicleTrajectory.find({ vin: 'VIN-TEST-001' }).sort({ timestamp: 1 });
    expect(stored).toHaveLength(10);
    expect(stored[0].driving_mode).toBe('Manual');
    expect(stored[5].driving_mode).toBe('LCC');
  });

  it('should filter by run_id', async () => {
    await VehicleTrajectory.insertMany([
      { vin: 'VIN-X', run_id: 'RUN-A', timestamp: new Date(), location: { lat: 31, lng: 121 }, speed_mps: 5, driving_mode: 'Manual' },
      { vin: 'VIN-X', run_id: 'RUN-B', timestamp: new Date(), location: { lat: 31, lng: 121 }, speed_mps: 10, driving_mode: 'ACC' },
    ]);

    const results = await VehicleTrajectory.find({ run_id: 'RUN-A' });
    expect(results).toHaveLength(1);
    expect(results[0].driving_mode).toBe('Manual');
  });

  it('should filter by time range', async () => {
    const now = Date.now();
    await VehicleTrajectory.insertMany([
      { vin: 'VIN-T', timestamp: new Date(now - 60000), location: { lat: 31, lng: 121 }, speed_mps: 5, driving_mode: 'Manual' },
      { vin: 'VIN-T', timestamp: new Date(now - 30000), location: { lat: 31, lng: 121 }, speed_mps: 10, driving_mode: 'ACC' },
      { vin: 'VIN-T', timestamp: new Date(now), location: { lat: 31, lng: 121 }, speed_mps: 15, driving_mode: 'LCC' },
    ]);

    const results = await VehicleTrajectory.find({
      vin: 'VIN-T',
      timestamp: { $gte: new Date(now - 40000), $lte: new Date(now - 20000) },
    });
    expect(results).toHaveLength(1);
    expect(results[0].driving_mode).toBe('ACC');
  });
});

describe('VehicleStatusSegment Model', () => {
  it('should create status segments', async () => {
    const now = Date.now();
    await VehicleStatusSegment.insertMany([
      { vin: 'VIN-S1', driving_mode: 'Manual', start_time: new Date(now - 3600000), end_time: new Date(now - 1800000), duration_ms: 1800000, mileage_km: 15.5 },
      { vin: 'VIN-S1', driving_mode: 'LCC', start_time: new Date(now - 1800000), end_time: new Date(now), duration_ms: 1800000, mileage_km: 42.3 },
    ]);

    const segments = await VehicleStatusSegment.find({ vin: 'VIN-S1' }).sort({ start_time: -1 });
    expect(segments).toHaveLength(2);
    expect(segments[0].driving_mode).toBe('LCC');
  });

  it('should aggregate duration and mileage by driving_mode', async () => {
    await VehicleStatusSegment.insertMany([
      { vin: 'VIN-A1', driving_mode: 'Manual', start_time: new Date(), duration_ms: 100000, mileage_km: 5 },
      { vin: 'VIN-A1', driving_mode: 'Manual', start_time: new Date(), duration_ms: 200000, mileage_km: 10 },
      { vin: 'VIN-A1', driving_mode: 'ACC', start_time: new Date(), duration_ms: 300000, mileage_km: 20 },
    ]);

    const result = await VehicleStatusSegment.aggregate([
      { $match: { vin: 'VIN-A1' } },
      { $group: { _id: '$driving_mode', total_duration_ms: { $sum: '$duration_ms' }, total_mileage_km: { $sum: '$mileage_km' } } },
      { $sort: { total_duration_ms: -1 } },
    ]);

    expect(result).toHaveLength(2);
    const manualSeg = result.find((r: any) => r._id === 'Manual');
    expect(manualSeg.total_duration_ms).toBe(300000);
    expect(manualSeg.total_mileage_km).toBe(15);
  });
});

describe('Vehicle Model — new fields', () => {
  it('should store and retrieve new fields', async () => {
    await Vehicle.create({
      vin: 'VIN-NF-001',
      plate_type: 'permanent',
      model_code: 'EP32',
      component_versions: { lidar_fw: 'v2.1', camera_fw: 'v3.0' },
      current_speed_mps: 15.5,
      current_status: 'Active',
      driving_mode: 'UrbanPilot',
    });

    const v = await Vehicle.findOne({ vin: 'VIN-NF-001' });
    expect(v).toBeTruthy();
    expect(v!.plate_type).toBe('permanent');
    expect(v!.model_code).toBe('EP32');
    expect(v!.component_versions).toEqual({ lidar_fw: 'v2.1', camera_fw: 'v3.0' });
    expect(v!.current_speed_mps).toBe(15.5);
    expect(v!.driving_mode).toBe('UrbanPilot');
  });

  it('should accept new DRIVING_MODE values', async () => {
    for (const mode of ['ACC', 'LCC', 'HighwayPilot', 'UrbanPilot']) {
      await Vehicle.create({ vin: `VIN-M-${mode}`, current_status: 'Active', driving_mode: mode });
      const v = await Vehicle.findOne({ vin: `VIN-M-${mode}` });
      expect(v!.driving_mode).toBe(mode);
    }
  });
});
