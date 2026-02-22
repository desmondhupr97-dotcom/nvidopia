import './setup.js';
import { describe, it, expect } from 'vitest';
import { KpiDefinition } from '@nvidopia/data-models';

const validDefinition = {
  kpi_id: 'kpi-test-01',
  name: 'Test KPI',
  description: 'A test KPI',
  data_source: 'issue' as const,
  formula: 'a + b',
  variables: [
    { name: 'a', source_entity: 'issue', field: 'issue_id', aggregation: 'count' as const },
    { name: 'b', source_entity: 'issue', field: 'issue_id', aggregation: 'count' as const },
  ],
  visualization: {
    chart_type: 'stat' as const,
  },
};

describe('KD-01: Create a KPI definition with required fields', () => {
  it('succeeds', async () => {
    const doc = await KpiDefinition.create(validDefinition);
    expect(doc.kpi_id).toBe('kpi-test-01');
    expect(doc.name).toBe('Test KPI');
    expect(doc.formula).toBe('a + b');
  });
});

describe('KD-02: List all definitions', () => {
  it('returns created definitions', async () => {
    await KpiDefinition.create(validDefinition);
    await KpiDefinition.create({
      ...validDefinition,
      kpi_id: 'kpi-test-02',
      name: 'Second KPI',
    });
    const list = await KpiDefinition.find({}).lean();
    expect(list.length).toBe(2);
  });
});

describe('KD-03: Get single definition by kpi_id', () => {
  it('finds by kpi_id', async () => {
    await KpiDefinition.create(validDefinition);
    const found = await KpiDefinition.findOne({ kpi_id: 'kpi-test-01' });
    expect(found).toBeTruthy();
    expect(found!.name).toBe('Test KPI');
  });
});

describe('KD-04: Update a definition formula', () => {
  it('updates formula', async () => {
    const doc = await KpiDefinition.create(validDefinition);
    doc.formula = 'a * 2 + b';
    await doc.save();
    const updated = await KpiDefinition.findOne({ kpi_id: 'kpi-test-01' });
    expect(updated!.formula).toBe('a * 2 + b');
  });
});

describe('KD-05: Delete a definition', () => {
  it('removes definition', async () => {
    const doc = await KpiDefinition.create(validDefinition);
    await KpiDefinition.deleteOne({ kpi_id: doc.kpi_id });
    const found = await KpiDefinition.findOne({ kpi_id: 'kpi-test-01' });
    expect(found).toBeNull();
  });
});

describe('KD-06: Create without name', () => {
  it('validation error', async () => {
    const { name: _, ...withoutName } = validDefinition;
    await expect(KpiDefinition.create(withoutName)).rejects.toThrow();
  });
});

describe('KD-07: Create with invalid data_source', () => {
  it('validation error', async () => {
    await expect(
      KpiDefinition.create({
        ...validDefinition,
        kpi_id: 'kpi-invalid-ds',
        data_source: 'invalid_entity' as never,
      }),
    ).rejects.toThrow();
  });
});
