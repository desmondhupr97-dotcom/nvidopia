import './setup.js';
import { describe, it, expect } from 'vitest';
import { Issue, Project, Task, Run } from '../src/index.js';

describe('FT-01: Old Issue doc without vehicle_dynamics field queries OK', () => {
  it('saves and queries Issue without vehicle_dynamics (undefined)', async () => {
    const doc = await Issue.create({
      issue_id: 'iss-ft01',
      run_id: 'run-ft01',
      trigger_timestamp: new Date(),
      category: 'Perception',
      severity: 'Medium',
    });
    expect(doc.vehicle_dynamics).toBeUndefined();
    const found = await Issue.findOne({ issue_id: 'iss-ft01' });
    expect(found).toBeTruthy();
    expect(found!.vehicle_dynamics).toBeUndefined();
  });
});

describe('FT-02: New Issue doc with extra fields (non-schema) saves OK with strict:false', () => {
  it('saves Issue with unknown top-level fields and preserves them', async () => {
    const doc = await Issue.create({
      issue_id: 'iss-ft02',
      run_id: 'run-ft02',
      trigger_timestamp: new Date(),
      category: 'Planning',
      severity: 'High',
      unknown_field_a: 'value_a',
      unknown_field_b: 42,
    });
    const found = await Issue.findOne({ issue_id: 'iss-ft02' }).lean();
    expect(found).toBeTruthy();
    expect((found as Record<string, unknown>).unknown_field_a).toBe('value_a');
    expect((found as Record<string, unknown>).unknown_field_b).toBe(42);
  });
});

describe('FT-03: Storing and retrieving custom key-value pairs via extra field', () => {
  it('saves and retrieves custom data in extra', async () => {
    const doc = await Issue.create({
      issue_id: 'iss-ft03',
      run_id: 'run-ft03',
      trigger_timestamp: new Date(),
      category: 'System',
      severity: 'Low',
      extra: { custom_key: 'custom_value', nested: { a: 1 } },
    });
    const found = await Issue.findOne({ issue_id: 'iss-ft03' });
    expect(found).toBeTruthy();
    expect(found!.extra).toEqual({ custom_key: 'custom_value', nested: { a: 1 } });
  });
});

describe('FT-04: Same tolerance works for Project, Task, Run', () => {
  it('Project saves with extra unknown fields', async () => {
    const doc = await Project.create({
      project_id: 'proj-ft04',
      name: 'FT04 Project',
      vehicle_platform: 'X',
      soc_architecture: 'Y',
      sensor_suite_version: '1.0',
      software_baseline_version: '2.0',
      start_date: new Date(),
      extra_field: 'preserved',
    });
    const found = await Project.findOne({ project_id: 'proj-ft04' }).lean();
    expect(found).toBeTruthy();
    expect((found as Record<string, unknown>).extra_field).toBe('preserved');
  });

  it('Task saves with extra unknown fields', async () => {
    const doc = await Task.create({
      task_id: 'task-ft04',
      project_id: 'proj-ft04',
      name: 'FT04 Task',
      task_type: 'Daily',
      custom_meta: { foo: 'bar' },
    });
    const found = await Task.findOne({ task_id: 'task-ft04' }).lean();
    expect(found).toBeTruthy();
    expect((found as Record<string, unknown>).custom_meta).toEqual({ foo: 'bar' });
  });

  it('Run saves with extra unknown fields', async () => {
    const doc = await Run.create({
      run_id: 'run-ft04',
      task_id: 'task-ft04',
      vehicle_vin: 'VIN123',
      arbitrary_field: 999,
    });
    const found = await Run.findOne({ run_id: 'run-ft04' }).lean();
    expect(found).toBeTruthy();
    expect((found as Record<string, unknown>).arbitrary_field).toBe(999);
  });
});

describe('FT-05: Old docs go through model layer without errors', () => {
  it('Issue without vehicle_dynamics saves and loads without error', async () => {
    const doc = await Issue.create({
      issue_id: 'iss-ft05',
      run_id: 'run-ft05',
      trigger_timestamp: new Date(),
      category: 'Other',
      severity: 'Blocker',
    });
    const found = await Issue.findById(doc._id);
    expect(found).toBeTruthy();
    expect(found!.issue_id).toBe('iss-ft05');
    expect(found!.vehicle_dynamics).toBeUndefined();
  });
});
