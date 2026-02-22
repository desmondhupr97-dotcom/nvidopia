import { create, all, type MathJsInstance } from 'mathjs';
import { Project, Task, Run, Issue } from '@nvidopia/data-models';
import type { Model } from 'mongoose';
import type { IKpiVariable, IKpiFilter } from '@nvidopia/data-models';

const math: MathJsInstance = create(all, {});

const ENTITY_MAP: Record<string, Model<any>> = {
  project: Project,
  task: Task,
  run: Run,
  issue: Issue,
};

function buildMongoFilter(filters?: IKpiFilter[], runtimeFilters?: Record<string, unknown>): Record<string, unknown> {
  const mongoFilter: Record<string, unknown> = {};

  if (runtimeFilters) {
    for (const [key, val] of Object.entries(runtimeFilters)) {
      if (val !== undefined && val !== null && val !== '') {
        mongoFilter[key] = val;
      }
    }
  }

  if (filters) {
    for (const f of filters) {
      const opMap: Record<string, string> = {
        eq: '$eq', ne: '$ne', gt: '$gt', gte: '$gte',
        lt: '$lt', lte: '$lte', in: '$in', nin: '$nin', regex: '$regex',
      };
      const mongoOp = opMap[f.operator];
      if (mongoOp) {
        mongoFilter[f.field] = { [mongoOp]: f.value };
      }
    }
  }

  return mongoFilter;
}

async function resolveVariable(
  variable: IKpiVariable,
  filters?: IKpiFilter[],
  runtimeFilters?: Record<string, unknown>,
  groupBy?: string[],
): Promise<number | number[]> {
  const model = ENTITY_MAP[variable.source_entity];
  if (!model) throw new Error(`Unknown entity: ${variable.source_entity}`);

  const matchStage = buildMongoFilter(filters, runtimeFilters);

  if (variable.aggregation === 'raw') {
    const docs = await model.find(matchStage).lean();
    return docs.map((d: any) => Number(d[variable.field] ?? 0));
  }

  const aggMap: Record<string, string> = {
    sum: '$sum', avg: '$avg', count: '$sum', min: '$min', max: '$max',
  };

  if (variable.aggregation === 'distinct_count') {
    const values = await model.distinct(variable.field, matchStage);
    return values.length;
  }

  const accumExpr = variable.aggregation === 'count'
    ? { $sum: 1 }
    : { [aggMap[variable.aggregation]]: `$${variable.field}` };

  const pipeline: any[] = [
    { $match: matchStage },
  ];

  if (groupBy && groupBy.length > 0) {
    const groupId: Record<string, string> = {};
    for (const g of groupBy) groupId[g] = `$${g}`;
    pipeline.push({ $group: { _id: groupId, result: accumExpr } });
    pipeline.push({ $sort: { _id: 1 } });
    const results = await model.aggregate(pipeline);
    return results.map((r: any) => Number(r.result ?? 0));
  }

  pipeline.push({ $group: { _id: null, result: accumExpr } });
  const results = await model.aggregate(pipeline);
  return results.length > 0 ? Number(results[0].result ?? 0) : 0;
}

export interface EvaluateResult {
  value: number | null;
  groups?: Array<{ group: Record<string, unknown>; value: number }>;
  error?: string;
}

export async function evaluateFormula(
  formula: string,
  variables: IKpiVariable[],
  options?: {
    filters?: IKpiFilter[];
    runtimeFilters?: Record<string, unknown>;
    groupBy?: string[];
  },
): Promise<EvaluateResult> {
  try {
    const scope: Record<string, unknown> = {};

    if (options?.groupBy && options.groupBy.length > 0) {
      const model = ENTITY_MAP[variables[0]?.source_entity ?? 'issue'];
      if (!model) throw new Error('No valid source entity for group_by');

      const matchStage = buildMongoFilter(options.filters, options.runtimeFilters);
      const groupId: Record<string, string> = {};
      for (const g of options.groupBy) groupId[g] = `$${g}`;

      const groupPipeline: any[] = [
        { $match: matchStage },
        { $group: { _id: groupId } },
        { $sort: { _id: 1 } },
      ];
      const groupKeys = await model.aggregate(groupPipeline);

      const groups: Array<{ group: Record<string, unknown>; value: number }> = [];
      for (const gk of groupKeys) {
        const groupFilters: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(gk._id)) {
          groupFilters[k] = v;
        }
        const mergedRuntime = { ...options.runtimeFilters, ...groupFilters };

        const innerScope: Record<string, unknown> = {};
        for (const v of variables) {
          innerScope[v.name] = await resolveVariable(v, options.filters, mergedRuntime);
        }

        const result = math.evaluate(formula, innerScope);
        groups.push({ group: gk._id, value: Number(result) });
      }

      return { value: null, groups };
    }

    for (const v of variables) {
      scope[v.name] = await resolveVariable(v, options?.filters, options?.runtimeFilters);
    }

    const result = math.evaluate(formula, scope);
    return { value: Number(result) };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Formula evaluation failed';
    return { value: null, error: message };
  }
}

const DANGEROUS_PATTERNS = /\b(require|eval|Function|import|process|globalThis)\s*\(/;

export function validateFormula(formula: string): { valid: boolean; error?: string } {
  if (DANGEROUS_PATTERNS.test(formula)) {
    return { valid: false, error: 'Formula contains disallowed patterns' };
  }
  try {
    math.parse(formula);
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Parse error' };
  }
}
