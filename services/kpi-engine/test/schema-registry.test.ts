import './setup.js';
import { describe, it, expect } from 'vitest';
import { Project, Task, Run, Issue } from '@nvidopia/data-models';
import { extractSchemaFields } from '../src/routes/schema-registry.js';
import type { Model } from 'mongoose';

const ENTITY_MAP: Record<string, Model<unknown>> = {
  project: Project,
  task: Task,
  run: Run,
  issue: Issue,
};

describe('SR-01: All 4 entities have fields returned', () => {
  it('project, task, run, issue all return fields', () => {
    for (const [, model] of Object.entries(ENTITY_MAP)) {
      const fields = extractSchemaFields(model);
      expect(fields.length).toBeGreaterThan(0);
      expect(fields.every((f) => typeof f.name === 'string')).toBe(true);
    }
  });
});

describe('SR-02: Issue fields include issue_id, severity, vehicle_dynamics', () => {
  it('Issue schema has required fields', () => {
    const fields = extractSchemaFields(Issue);
    const names = fields.map((f) => f.name);
    expect(names).toContain('issue_id');
    expect(names).toContain('severity');
    expect(names).toContain('vehicle_dynamics');
  });
});

describe('SR-03: Field metadata has name, type, required properties', () => {
  it('each field has name, type, required', () => {
    const fields = extractSchemaFields(Issue);
    for (const f of fields) {
      expect(f).toHaveProperty('name');
      expect(f).toHaveProperty('type');
      expect(f).toHaveProperty('required');
      expect(typeof f.name).toBe('string');
      expect(typeof f.type).toBe('string');
      expect(typeof f.required).toBe('boolean');
    }
  });
});

describe('SR-04: Issue vehicle_dynamics field has sub-fields', () => {
  it('vehicle_dynamics has children when it is a sub-document', () => {
    const fields = extractSchemaFields(Issue);
    const vd = fields.find((f) => f.name === 'vehicle_dynamics');
    expect(vd).toBeDefined();
    expect(vd!.children).toBeDefined();
    expect(vd!.children!.length).toBeGreaterThan(0);
  });
});

describe('SR-05: Fields with enum values return the enum array', () => {
  it('severity has enum array', () => {
    const fields = extractSchemaFields(Issue);
    const severity = fields.find((f) => f.name === 'severity');
    expect(severity).toBeDefined();
    expect(severity!.enum).toBeDefined();
    expect(Array.isArray(severity!.enum)).toBe(true);
    expect(severity!.enum!.length).toBeGreaterThan(0);
  });
});
