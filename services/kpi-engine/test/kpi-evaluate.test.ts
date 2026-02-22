import './setup.js';
import { describe, it, expect } from 'vitest';
import { Issue, Run, Project, Task } from '@nvidopia/data-models';
import { evaluateFormula } from '../src/formula-engine.js';

async function seedKpiTestData() {
  await Project.create({
    project_id: 'PROJ-KE-001',
    name: 'KPI Test Project',
    vehicle_platform: 'ORIN-X',
    soc_architecture: 'dual-orin-x',
    sensor_suite_version: 'SS-4.2',
    software_baseline_version: 'v1',
    start_date: new Date(),
    status: 'Active',
  });
  await Project.create({
    project_id: 'PROJ-KE-002',
    name: 'Other Project',
    vehicle_platform: 'ORIN-X',
    soc_architecture: 'dual-orin-x',
    sensor_suite_version: 'SS-4.2',
    software_baseline_version: 'v1',
    start_date: new Date(),
    status: 'Active',
  });

  await Task.create([
    { task_id: 'TASK-KE-001', project_id: 'PROJ-KE-001', name: 'Task 1', task_type: 'Smoke', priority: 'High', status: 'Pending' },
    { task_id: 'TASK-KE-002', project_id: 'PROJ-KE-002', name: 'Task 2', task_type: 'Daily', priority: 'Medium', status: 'Pending' },
  ]);

  await Run.create([
    { run_id: 'RUN-KE-001', task_id: 'TASK-KE-001', vehicle_vin: 'VIN-001', status: 'Completed' },
    { run_id: 'RUN-KE-002', task_id: 'TASK-KE-001', vehicle_vin: 'VIN-002', status: 'Completed' },
    { run_id: 'RUN-KE-003', task_id: 'TASK-KE-002', vehicle_vin: 'VIN-003', status: 'Completed' },
  ]);

  await Issue.create([
    { issue_id: 'ISS-KE-001', run_id: 'RUN-KE-001', trigger_timestamp: new Date(), category: 'Perception', severity: 'High' },
    { issue_id: 'ISS-KE-002', run_id: 'RUN-KE-001', trigger_timestamp: new Date(), category: 'Planning', severity: 'Medium' },
    { issue_id: 'ISS-KE-003', run_id: 'RUN-KE-001', trigger_timestamp: new Date(), category: 'Perception', severity: 'Low' },
    { issue_id: 'ISS-KE-004', run_id: 'RUN-KE-002', trigger_timestamp: new Date(), category: 'System', severity: 'Medium' },
    { issue_id: 'ISS-KE-005', run_id: 'RUN-KE-003', trigger_timestamp: new Date(), category: 'Perception', severity: 'High' },
  ]);
}

describe('KE-01: Evaluate single-variable KPI (count issues)', () => {
  it('evaluates issue_count formula', async () => {
    await seedKpiTestData();
    const result = await evaluateFormula('issue_count', [
      { name: 'issue_count', source_entity: 'issue', field: 'issue_id', aggregation: 'count' },
    ]);
    expect(result.error).toBeUndefined();
    expect(result.value).toBe(5);
  });
});

describe('KE-02: Evaluate KPI with filter (project_id filter via runtime)', () => {
  it('filters tasks by project_id', async () => {
    await seedKpiTestData();
    const result = await evaluateFormula('task_count', [
      { name: 'task_count', source_entity: 'task', field: 'task_id', aggregation: 'count' },
    ], { runtimeFilters: { project_id: 'PROJ-KE-001' } });
    expect(result.error).toBeUndefined();
    expect(result.value).toBe(1);
  });
});

describe('KE-03: Evaluate grouped KPI (group by category)', () => {
  it('returns groups with values per category', async () => {
    await seedKpiTestData();
    const result = await evaluateFormula('issue_count', [
      { name: 'issue_count', source_entity: 'issue', field: 'issue_id', aggregation: 'count' },
    ], { groupBy: ['category'] });
    expect(result.error).toBeUndefined();
    expect(result.groups).toBeDefined();
    expect(result.groups!.length).toBeGreaterThanOrEqual(1);
    const perceptionGroup = result.groups!.find((g) => g.group.category === 'Perception');
    expect(perceptionGroup).toBeDefined();
    expect(perceptionGroup!.value).toBe(3);
  });
});

describe('KE-04: Existing hardcoded KPI data compatibility check', () => {
  it('verifies Issue and Run models work with evaluateFormula', async () => {
    await seedKpiTestData();
    const issueResult = await evaluateFormula('issue_count', [
      { name: 'issue_count', source_entity: 'issue', field: 'issue_id', aggregation: 'count' },
    ]);
    const runResult = await evaluateFormula('run_count', [
      { name: 'run_count', source_entity: 'run', field: 'run_id', aggregation: 'count' },
    ]);
    expect(issueResult.error).toBeUndefined();
    expect(runResult.error).toBeUndefined();
    expect(issueResult.value).toBe(5);
    expect(runResult.value).toBe(3);
  });
});
