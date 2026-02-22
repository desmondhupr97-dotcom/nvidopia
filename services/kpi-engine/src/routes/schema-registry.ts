import { Router, type Request, type Response } from 'express';
import { Project, Task, Run, Issue } from '@nvidopia/data-models';
import { asyncHandler } from '@nvidopia/service-toolkit';
import type { Model } from 'mongoose';

const router = Router();

export interface FieldMeta {
  name: string;
  type: string;
  required: boolean;
  enum?: string[];
  children?: FieldMeta[];
}

const ENTITY_MAP: Record<string, Model<any>> = {
  project: Project,
  task: Task,
  run: Run,
  issue: Issue,
};

export function extractSchemaFields(model: Model<any>): FieldMeta[] {
  const fields: FieldMeta[] = [];
  const schemaPaths = model.schema.paths;

  for (const [name, pathObj] of Object.entries(schemaPaths)) {
    if (name.startsWith('_')) continue;

    const pathAny = pathObj as any;
    const field: FieldMeta = {
      name,
      type: pathAny.instance ?? 'Mixed',
      required: !!pathAny.isRequired,
    };

    if (pathAny.options?.enum) {
      field.enum = pathAny.options.enum;
    } else if (pathAny.enumValues?.length) {
      field.enum = pathAny.enumValues;
    }

    if (pathAny.schema) {
      field.children = extractSubSchemaFields(pathAny.schema);
    }

    fields.push(field);
  }

  return fields;
}

function extractSubSchemaFields(schema: any): FieldMeta[] {
  const fields: FieldMeta[] = [];
  for (const [name, pathObj] of Object.entries(schema.paths)) {
    if (name.startsWith('_')) continue;
    const pathAny = pathObj as any;
    const field: FieldMeta = {
      name,
      type: pathAny.instance ?? 'Mixed',
      required: !!pathAny.isRequired,
    };
    if (pathAny.options?.enum) field.enum = pathAny.options.enum;
    if (pathAny.schema) field.children = extractSubSchemaFields(pathAny.schema);
    fields.push(field);
  }
  return fields;
}

router.get('/fields', asyncHandler(async (_req: Request, res: Response) => {
  const result: Record<string, { entity: string; fields: FieldMeta[] }> = {};
  for (const [entity, model] of Object.entries(ENTITY_MAP)) {
    result[entity] = { entity, fields: extractSchemaFields(model) };
  }
  res.json(result);
}));

router.get('/fields/:entity', asyncHandler(async (req: Request, res: Response) => {
  const entity = (req.params.entity as string).toLowerCase();
  const model = ENTITY_MAP[entity];
  if (!model) {
    res.status(404).json({ error: `Entity "${entity}" not found. Available: ${Object.keys(ENTITY_MAP).join(', ')}` });
    return;
  }
  res.json({ entity, fields: extractSchemaFields(model) });
}));

export default router;
