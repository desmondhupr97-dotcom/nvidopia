import './setup.js';
import { describe, it, expect } from 'vitest';
import { Issue, IssueTimeSeries } from '@nvidopia/data-models';

async function createIssue(issueId: string) {
  return Issue.create({
    issue_id: issueId,
    run_id: 'run-1',
    trigger_timestamp: new Date(),
    category: 'Perception',
    severity: 'Medium',
  });
}

describe('TS-01: Create a time-series channel for an issue', () => {
  it('creates and persists channel', async () => {
    await createIssue('iss-ts01');
    const doc = await IssueTimeSeries.create({
      issue_id: 'iss-ts01',
      channel: 'lidar_front',
      channel_type: 'sensor',
      time_range_ms: { start: -500, end: 500 },
      data_points: [],
    });

    expect(doc.issue_id).toBe('iss-ts01');
    expect(doc.channel).toBe('lidar_front');
    expect(doc.channel_type).toBe('sensor');
    expect(doc.time_range_ms?.start).toBe(-500);
    expect(doc.time_range_ms?.end).toBe(500);
    expect(doc.data_points).toEqual([]);
  });
});

describe('TS-02: Query all channels for an issue', () => {
  it('returns all channels for issue_id', async () => {
    await createIssue('iss-ts02');
    await IssueTimeSeries.create([
      { issue_id: 'iss-ts02', channel: 'ch1', channel_type: 'sensor', time_range_ms: { start: 0, end: 100 }, data_points: [] },
      { issue_id: 'iss-ts02', channel: 'ch2', channel_type: 'target', time_range_ms: { start: 0, end: 100 }, data_points: [] },
    ]);

    const channels = await IssueTimeSeries.find({ issue_id: 'iss-ts02' }).sort({ channel: 1 }).lean();
    expect(channels).toHaveLength(2);
    expect(channels.map((c) => c.channel)).toEqual(['ch1', 'ch2']);
  });
});

describe('TS-03: Query specific channel by issue_id + channel name', () => {
  it('finds single channel', async () => {
    await createIssue('iss-ts03');
    await IssueTimeSeries.create({
      issue_id: 'iss-ts03',
      channel: 'radar_front',
      channel_type: 'sensor',
      time_range_ms: { start: -1000, end: 1000 },
      data_points: [{ t: 0, values: { range: 50 } }],
    });

    const doc = await IssueTimeSeries.findOne({ issue_id: 'iss-ts03', channel: 'radar_front' }).lean();
    expect(doc).toBeDefined();
    expect(doc?.channel).toBe('radar_front');
    expect(doc?.channel_type).toBe('sensor');
    expect(doc?.data_points).toHaveLength(1);
    expect(doc?.data_points?.[0].values).toEqual({ range: 50 });
  });
});

describe('TS-04: Create multiple channels (sensor + target + state_machine)', () => {
  it('creates and queries all channel types', async () => {
    await createIssue('iss-ts04');
    await IssueTimeSeries.create([
      { issue_id: 'iss-ts04', channel: 'sensor_ch', channel_type: 'sensor', time_range_ms: { start: 0, end: 100 }, data_points: [] },
      { issue_id: 'iss-ts04', channel: 'target_ch', channel_type: 'target', time_range_ms: { start: 0, end: 100 }, data_points: [] },
      { issue_id: 'iss-ts04', channel: 'sm_ch', channel_type: 'state_machine', time_range_ms: { start: 0, end: 100 }, data_points: [] },
    ]);

    const channels = await IssueTimeSeries.find({ issue_id: 'iss-ts04' }).sort({ channel: 1 }).lean();
    expect(channels).toHaveLength(3);
    expect(channels.map((c) => c.channel_type)).toEqual(['sensor', 'state_machine', 'target']);
  });
});

describe('TS-05: Channel not found returns empty result from findOne', () => {
  it('findOne returns null for non-existent channel', async () => {
    await createIssue('iss-ts05');
    const doc = await IssueTimeSeries.findOne({ issue_id: 'iss-ts05', channel: 'nonexistent' });
    expect(doc).toBeNull();
  });
});

describe('TS-06: Data points are stored correctly with time offset values', () => {
  it('persists and reads data_points with t values', async () => {
    await createIssue('iss-ts06');
    const dataPoints = [
      { t: -1000, values: { count: 100 } },
      { t: 0, values: { count: 120 } },
      { t: 1000, values: { count: 110 } },
    ];
    await IssueTimeSeries.create({
      issue_id: 'iss-ts06',
      channel: 'lidar_test',
      channel_type: 'sensor',
      time_range_ms: { start: -1000, end: 1000 },
      data_points: dataPoints,
    });

    const doc = await IssueTimeSeries.findOne({ issue_id: 'iss-ts06', channel: 'lidar_test' }).lean();
    expect(doc?.data_points).toHaveLength(3);
    expect(doc?.data_points?.[0]).toEqual({ t: -1000, values: { count: 100 } });
    expect(doc?.data_points?.[1]).toEqual({ t: 0, values: { count: 120 } });
    expect(doc?.data_points?.[2]).toEqual({ t: 1000, values: { count: 110 } });
  });
});
