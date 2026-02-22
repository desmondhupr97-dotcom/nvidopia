import './setup.js';
import { describe, it, expect } from 'vitest';
import { Issue } from '@nvidopia/data-models';

function createIssue(overrides: Record<string, unknown> = {}) {
  return Issue.create({
    issue_id: `ISS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    run_id: 'run-1',
    trigger_timestamp: new Date(),
    category: 'Perception',
    severity: 'Medium',
    ...overrides,
  });
}

describe('SN-01: Save vehicle_dynamics snapshot to an Issue document', () => {
  it('saves snapshot and persists to DB', async () => {
    const issue = await createIssue();
    const snapshot = {
      speed_mps: 25.5,
      acceleration_mps2: -2.1,
      gear: 'D',
      steering_angle_deg: 15,
    };
    issue.vehicle_dynamics = snapshot;
    await issue.save();

    const found = await Issue.findOne({ issue_id: issue.issue_id }).lean();
    expect(found?.vehicle_dynamics).toBeDefined();
    expect(found?.vehicle_dynamics?.speed_mps).toBe(25.5);
    expect(found?.vehicle_dynamics?.acceleration_mps2).toBe(-2.1);
    expect(found?.vehicle_dynamics?.gear).toBe('D');
    expect(found?.vehicle_dynamics?.steering_angle_deg).toBe(15);
  });
});

describe('SN-02: Read back the snapshot, verify all fields', () => {
  it('reads and verifies all snapshot fields', async () => {
    const issue = await createIssue();
    const snapshot = {
      speed_mps: 30,
      acceleration_mps2: 1.5,
      lateral_acceleration_mps2: 0.8,
      yaw_rate_dps: 2.1,
      heading_deg: 45,
      steering_angle_deg: 10,
      throttle_pct: 60,
      brake_pressure_bar: 0,
      gear: 'D',
      wheel_speeds_mps: [29.5, 30.1, 29.8, 30.2],
    };
    issue.vehicle_dynamics = snapshot;
    await issue.save();

    const found = await Issue.findOne({ issue_id: issue.issue_id }).lean();
    expect(found?.vehicle_dynamics?.speed_mps).toBe(30);
    expect(found?.vehicle_dynamics?.acceleration_mps2).toBe(1.5);
    expect(found?.vehicle_dynamics?.lateral_acceleration_mps2).toBe(0.8);
    expect(found?.vehicle_dynamics?.yaw_rate_dps).toBe(2.1);
    expect(found?.vehicle_dynamics?.heading_deg).toBe(45);
    expect(found?.vehicle_dynamics?.steering_angle_deg).toBe(10);
    expect(found?.vehicle_dynamics?.throttle_pct).toBe(60);
    expect(found?.vehicle_dynamics?.brake_pressure_bar).toBe(0);
    expect(found?.vehicle_dynamics?.gear).toBe('D');
    expect(found?.vehicle_dynamics?.wheel_speeds_mps).toEqual([29.5, 30.1, 29.8, 30.2]);
  });
});

describe('SN-03: Save snapshot with only partial fields (just speed_mps)', () => {
  it('succeeds, others undefined', async () => {
    const issue = await createIssue();
    issue.vehicle_dynamics = { speed_mps: 12.3 } as any;
    await issue.save();

    const found = await Issue.findOne({ issue_id: issue.issue_id }).lean();
    expect(found?.vehicle_dynamics?.speed_mps).toBe(12.3);
    expect(found?.vehicle_dynamics?.acceleration_mps2).toBeUndefined();
    expect(found?.vehicle_dynamics?.gear).toBeUndefined();
  });
});

describe('SN-04: Overwrite snapshot with new data', () => {
  it('replaces existing snapshot', async () => {
    const issue = await createIssue();
    issue.vehicle_dynamics = { speed_mps: 10, gear: 'D' } as any;
    await issue.save();

    issue.vehicle_dynamics = { speed_mps: 50, acceleration_mps2: 3, gear: 'N' } as any;
    await issue.save();

    const found = await Issue.findOne({ issue_id: issue.issue_id }).lean();
    expect(found?.vehicle_dynamics?.speed_mps).toBe(50);
    expect(found?.vehicle_dynamics?.acceleration_mps2).toBe(3);
    expect(found?.vehicle_dynamics?.gear).toBe('N');
  });
});

describe('SN-05: Issue without snapshot returns undefined for vehicle_dynamics', () => {
  it('vehicle_dynamics is undefined when not set', async () => {
    const issue = await createIssue();
    await issue.save();

    const found = await Issue.findOne({ issue_id: issue.issue_id }).lean();
    expect(found?.vehicle_dynamics).toBeUndefined();
  });
});
