import './setup.js';
import { describe, it, expect } from 'vitest';
import { Issue } from '@nvidopia/data-models';
import { evaluateFormula, validateFormula } from '../src/formula-engine.js';

describe('FE-01: validateFormula simple expression', () => {
  it("validateFormula('a + b') is valid", () => {
    const result = validateFormula('a + b');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('FE-02: validateFormula invalid syntax', () => {
  it("validateFormula('a + )') is invalid", () => {
    const result = validateFormula('a + )');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('FE-03: validateFormula with function calls', () => {
  it("validateFormula('sum(x) / count(y)') is valid", () => {
    const result = validateFormula('sum(x) / count(y)');
    expect(result.valid).toBe(true);
  });
});

describe('FE-04: validateFormula injection attempt', () => {
  it('require("fs") or similar injection is rejected', () => {
    const result = validateFormula('require("fs")');
    expect(result.valid).toBe(false);
  });
});

describe('FE-05: evaluateFormula with seed data', () => {
  it('evaluates formula when Issue docs exist', async () => {
    await Issue.create([
      {
        issue_id: 'iss-fe05-1',
        run_id: 'run-fe05',
        trigger_timestamp: new Date(),
        category: 'Perception',
        severity: 'Medium',
      },
      {
        issue_id: 'iss-fe05-2',
        run_id: 'run-fe05',
        trigger_timestamp: new Date(),
        category: 'Planning',
        severity: 'High',
      },
      {
        issue_id: 'iss-fe05-3',
        run_id: 'run-fe05',
        trigger_timestamp: new Date(),
        category: 'System',
        severity: 'Low',
      },
    ]);

    const result = await evaluateFormula('count_issues', [
      {
        name: 'count_issues',
        source_entity: 'issue',
        field: 'issue_id',
        aggregation: 'count',
      },
    ]);

    expect(result.error).toBeUndefined();
    expect(result.value).toBe(3);
  });
});
