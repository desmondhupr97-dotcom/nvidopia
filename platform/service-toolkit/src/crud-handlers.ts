import { type Request, type Response, type NextFunction } from 'express';
import type { Model } from 'mongoose';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncHandler(fn: AsyncRouteHandler): AsyncRouteHandler {
  return (req, res, next) => fn(req, res, next).catch(next);
}

export interface ListOptions {
  allowedFilters: string[];
  defaultSort?: Record<string, 1 | -1>;
  defaultLimit?: number;
  maxLimit?: number;
}

export function createListHandler(model: Model<any>, options: ListOptions): AsyncRouteHandler {
  const { allowedFilters, defaultSort = { created_at: -1 }, defaultLimit = 50, maxLimit = 200 } = options;

  return asyncHandler(async (req: Request, res: Response) => {
    const filter: Record<string, unknown> = {};
    for (const key of allowedFilters) {
      if (req.query[key] != null) filter[key] = req.query[key];
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(maxLimit, Math.max(1, Number(req.query.limit) || defaultLimit));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      model.find(filter).sort(defaultSort).skip(skip).limit(limit),
      model.countDocuments(filter),
    ]);

    res.json({ data, total, page, limit, pages: Math.ceil(total / limit) });
  });
}

export function createGetByIdHandler(
  model: Model<any>,
  idField: string,
  entityName: string,
): AsyncRouteHandler {
  return asyncHandler(async (req: Request, res: Response) => {
    const doc = await model.findOne({ [idField]: req.params.id });
    if (!doc) {
      res.status(404).json({ error: `${entityName} not found` });
      return;
    }
    res.json(doc);
  });
}

export function createDocHandler(
  model: Model<any>,
  idField: string,
): AsyncRouteHandler {
  return asyncHandler(async (req: Request, res: Response) => {
    try {
      const doc = new model(req.body);
      await doc.save();
      res.status(201).json(doc);
    } catch (err: any) {
      if (err.code === 11000) {
        res.status(409).json({ error: `Duplicate ${idField}` });
        return;
      }
      throw err;
    }
  });
}

export function createUpdateHandler(
  model: Model<any>,
  idField: string,
  entityName: string,
): AsyncRouteHandler {
  return asyncHandler(async (req: Request, res: Response) => {
    const doc = await model.findOneAndUpdate(
      { [idField]: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!doc) {
      res.status(404).json({ error: `${entityName} not found` });
      return;
    }
    res.json(doc);
  });
}
