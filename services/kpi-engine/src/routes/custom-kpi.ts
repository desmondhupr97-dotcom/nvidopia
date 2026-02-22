import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { KpiDefinition } from '@nvidopia/data-models';
import { asyncHandler } from '@nvidopia/service-toolkit';
import { evaluateFormula, validateFormula } from '../formula-engine.js';

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

export default router;
