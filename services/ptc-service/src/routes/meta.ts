import { Router, type Request, type Response } from 'express';
import { PtcBuild, PtcCar, PtcTag, PtcDrive } from '@nvidopia/data-models';
import { asyncHandler } from '@nvidopia/service-toolkit';

const router = Router();

router.get('/builds', asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query;
  const filter: Record<string, unknown> = {};
  if (q && typeof q === 'string') {
    filter.$or = [
      { build_id: { $regex: q, $options: 'i' } },
      { version_tag: { $regex: q, $options: 'i' } },
    ];
  }
  const builds = await PtcBuild.find(filter).sort({ build_time: -1 }).lean();
  res.json(builds);
}));

router.get('/cars', asyncHandler(async (req: Request, res: Response) => {
  const { q, build_id, tag_id } = req.query;
  const filter: Record<string, unknown> = {};
  if (q && typeof q === 'string') {
    filter.$or = [
      { car_id: { $regex: q, $options: 'i' } },
      { name: { $regex: q, $options: 'i' } },
    ];
  }
  if (build_id || tag_id) {
    const driveFilter: Record<string, unknown> = {};
    if (build_id && typeof build_id === 'string') driveFilter.build_id = build_id;
    if (tag_id && typeof tag_id === 'string') driveFilter.tag_id = tag_id;
    const carIds = await PtcDrive.distinct('car_id', driveFilter);
    filter.car_id = { $in: carIds };
  }
  const cars = await PtcCar.find(filter).sort({ car_id: 1 }).lean();
  res.json(cars);
}));

router.get('/tags', asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query;
  const filter: Record<string, unknown> = {};
  if (q && typeof q === 'string') {
    filter.name = { $regex: q, $options: 'i' };
  }
  const tags = await PtcTag.find(filter).sort({ name: 1 }).lean();
  res.json(tags);
}));

router.get('/drives', asyncHandler(async (req: Request, res: Response) => {
  const { car_id, build_id, tag_id, q, page, limit: limitParam } = req.query;
  const filter: Record<string, unknown> = {};
  if (car_id && typeof car_id === 'string') filter.car_id = car_id;
  if (build_id && typeof build_id === 'string') filter.build_id = build_id;
  if (tag_id && typeof tag_id === 'string') filter.tag_id = tag_id;
  if (q && typeof q === 'string') {
    filter.drive_id = { $regex: q, $options: 'i' };
  }
  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(limitParam) || 50));
  const total = await PtcDrive.countDocuments(filter);
  const drives = await PtcDrive.find(filter)
    .sort({ date: -1 })
    .skip((pageNum - 1) * pageSize)
    .limit(pageSize)
    .lean();
  res.json({ data: drives, total, page: pageNum, limit: pageSize });
}));

router.get('/drives/filter', asyncHandler(async (req: Request, res: Response) => {
  const { builds, cars, tags } = req.query;
  const filter: Record<string, unknown> = {};
  if (builds && typeof builds === 'string') {
    filter.build_id = { $in: builds.split(',') };
  }
  if (cars && typeof cars === 'string') {
    filter.car_id = { $in: cars.split(',') };
  }
  if (tags && typeof tags === 'string') {
    filter.tag_id = { $in: tags.split(',') };
  }

  if (Object.keys(filter).length === 0) {
    res.status(400).json({ error: 'At least one filter (builds, cars, tags) is required' });
    return;
  }

  const result = await PtcDrive.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$car_id',
        drive_count: { $sum: 1 },
        total_mileage: { $sum: '$mileage_km' },
        builds: { $addToSet: '$build_id' },
        tags: { $addToSet: '$tag_id' },
        min_date: { $min: '$date' },
        max_date: { $max: '$date' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json(result.map((r) => ({
    car_id: r._id,
    drive_count: r.drive_count,
    total_mileage: r.total_mileage,
    builds: r.builds,
    tags: r.tags,
    date_range: { start: r.min_date, end: r.max_date },
  })));
}));

export default router;
