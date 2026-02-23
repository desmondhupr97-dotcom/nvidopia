import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import Ajv from 'ajv';
import { KpiDefinition } from '@nvidopia/data-models';
import { asyncHandler } from '@nvidopia/service-toolkit';
import { evaluateFormula, validateFormula } from '../formula-engine.js';

const ajv = new Ajv({ allErrors: true, strict: false });

const BATCH_IMPORT_SCHEMA = {
  type: 'object',
  required: ['dashboards'],
  properties: {
    dashboards: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['dashboard_id', 'name', 'kpis'],
        properties: {
          dashboard_id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          kpis: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['name', 'data_source', 'variables', 'formula'],
              properties: {
                kpi_id: { type: 'string' },
                name: { type: 'string' },
                data_source: { type: 'string', enum: ['project', 'task', 'run', 'issue', 'cross'] },
                variables: { type: 'array', minItems: 1 },
                formula: { type: 'string' },
                formula_format: { type: 'string', enum: ['mathjs'] },
                vchart_spec: { type: 'object' },
                visualization: { type: 'object' },
                filters: { type: 'array' },
                group_by: { type: 'array' },
                display_order: { type: 'integer' },
                enabled: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  },
} as const;

const validateBatchImport = ajv.compile(BATCH_IMPORT_SCHEMA);

const router = Router();

router.get('/definitions', asyncHandler(async (_req: Request, res: Response) => {
  const definitions = await KpiDefinition.find().sort({ display_order: 1, created_at: 1 }).lean();
  res.json(definitions);
}));

router.post('/definitions', asyncHandler(async (req: Request, res: Response) => {
  const { name, formula, variables, visualization, data_source } = req.body;

  if (!name || !formula || !variables || !visualization || !data_source) {
    res.status(400).json({
      error: 'name, formula, variables, visualization, and data_source are required',
    });
    return;
  }

  const validation = validateFormula(formula);
  if (!validation.valid) {
    res.status(400).json({ error: `Invalid formula: ${validation.error}` });
    return;
  }

  const kpiId = req.body.kpi_id ?? `KPI-${crypto.randomUUID().slice(0, 8)}`;
  const definition = await KpiDefinition.create({ ...req.body, kpi_id: kpiId });
  res.status(201).json(definition);
}));

router.get('/definitions/:id', asyncHandler(async (req: Request, res: Response) => {
  const def = await KpiDefinition.findOne({ kpi_id: req.params.id }).lean();
  if (!def) {
    res.status(404).json({ error: `KPI definition "${req.params.id}" not found` });
    return;
  }
  res.json(def);
}));

router.put('/definitions/:id', asyncHandler(async (req: Request, res: Response) => {
  const { kpi_id, ...update } = req.body;

  if (update.formula) {
    const validation = validateFormula(update.formula);
    if (!validation.valid) {
      res.status(400).json({ error: `Invalid formula: ${validation.error}` });
      return;
    }
  }

  const def = await KpiDefinition.findOneAndUpdate(
    { kpi_id: req.params.id },
    { $set: update },
    { new: true, runValidators: true },
  );
  if (!def) {
    res.status(404).json({ error: `KPI definition "${req.params.id}" not found` });
    return;
  }
  res.json(def);
}));

router.delete('/definitions/:id', asyncHandler(async (req: Request, res: Response) => {
  const def = await KpiDefinition.findOneAndDelete({ kpi_id: req.params.id });
  if (!def) {
    res.status(404).json({ error: `KPI definition "${req.params.id}" not found` });
    return;
  }
  res.json({ deleted: true, kpi_id: req.params.id });
}));

router.get('/custom/:id/evaluate', asyncHandler(async (req: Request, res: Response) => {
  const def = await KpiDefinition.findOne({ kpi_id: req.params.id }).lean();
  if (!def) {
    res.status(404).json({ error: `KPI definition "${req.params.id}" not found` });
    return;
  }

  const runtimeFilters: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(req.query)) {
    if (k !== 'id' && v) runtimeFilters[k] = v;
  }

  const result = await evaluateFormula(def.formula, def.variables, {
    filters: def.filters,
    runtimeFilters,
    groupBy: def.group_by,
  });

  res.json({
    kpi_id: def.kpi_id,
    name: def.name,
    ...result,
    visualization: def.visualization,
    vchart_spec: (def as any).vchart_spec ?? null,
    renderer: (def as any).renderer ?? 'recharts',
    computed_at: new Date().toISOString(),
  });
}));

router.post('/custom/preview', asyncHandler(async (req: Request, res: Response) => {
  const { formula, variables, filters, group_by, runtime_filters } = req.body;

  if (!formula || !variables) {
    res.status(400).json({ error: 'formula and variables are required' });
    return;
  }

  const validation = validateFormula(formula);
  if (!validation.valid) {
    res.status(400).json({ error: `Invalid formula: ${validation.error}` });
    return;
  }

  const result = await evaluateFormula(formula, variables, {
    filters,
    runtimeFilters: runtime_filters,
    groupBy: group_by,
  });

  res.json({ ...result, preview: true, computed_at: new Date().toISOString() });
}));

router.post('/definitions/import', asyncHandler(async (req: Request, res: Response) => {
  if (!validateBatchImport(req.body)) {
    res.status(400).json({
      error: 'Invalid batch import JSON',
      details: validateBatchImport.errors,
    });
    return;
  }

  const { dashboards } = req.body;
  const results: Array<{
    dashboard_id: string;
    created: string[];
    updated: string[];
    failed: Array<{ kpi_id?: string; name: string; error: string }>;
  }> = [];

  for (const dashboard of dashboards) {
    const created: string[] = [];
    const updated: string[] = [];
    const failed: Array<{ kpi_id?: string; name: string; error: string }> = [];

    for (const kpi of dashboard.kpis) {
      const formulaCheck = validateFormula(kpi.formula);
      if (!formulaCheck.valid) {
        failed.push({ kpi_id: kpi.kpi_id, name: kpi.name, error: `Invalid formula: ${formulaCheck.error}` });
        continue;
      }

      const kpiId = kpi.kpi_id ?? `KPI-${crypto.randomUUID().slice(0, 8)}`;
      const hasVChartSpec = kpi.vchart_spec && typeof kpi.vchart_spec === 'object';

      const doc = {
        kpi_id: kpiId,
        name: kpi.name,
        description: kpi.description,
        data_source: kpi.data_source,
        variables: kpi.variables,
        formula: kpi.formula,
        formula_format: kpi.formula_format ?? 'mathjs',
        filters: kpi.filters ?? [],
        group_by: kpi.group_by ?? [],
        visualization: kpi.visualization ?? { chart_type: 'stat' },
        vchart_spec: hasVChartSpec ? kpi.vchart_spec : undefined,
        renderer: hasVChartSpec ? 'vchart' : 'recharts',
        dashboard_id: dashboard.dashboard_id,
        dashboard_name: dashboard.name,
        display_order: kpi.display_order ?? 0,
        enabled: kpi.enabled !== false,
      };

      try {
        const existing = await KpiDefinition.findOne({ kpi_id: kpiId });
        if (existing) {
          await KpiDefinition.updateOne({ kpi_id: kpiId }, { $set: doc });
          updated.push(kpiId);
        } else {
          await KpiDefinition.create(doc);
          created.push(kpiId);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        failed.push({ kpi_id: kpiId, name: kpi.name, error: msg });
      }
    }

    results.push({ dashboard_id: dashboard.dashboard_id, created, updated, failed });
  }

  const totalCreated = results.reduce((s, r) => s + r.created.length, 0);
  const totalUpdated = results.reduce((s, r) => s + r.updated.length, 0);
  const totalFailed = results.reduce((s, r) => s + r.failed.length, 0);

  res.status(totalFailed > 0 && totalCreated === 0 && totalUpdated === 0 ? 400 : 201).json({
    summary: { dashboards: results.length, created: totalCreated, updated: totalUpdated, failed: totalFailed },
    results,
  });
}));

export default router;
