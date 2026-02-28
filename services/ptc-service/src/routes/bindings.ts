import { Router, type Request, type Response } from 'express';
import { PtcBinding, PtcBuild, PtcTask, PtcDrive } from '@nvidopia/data-models';
import { asyncHandler } from '@nvidopia/service-toolkit';
import crypto from 'crypto';

interface BindingCar {
  car_id: string;
  drives: Array<{ drive_id: string; selected: boolean }>;
}

async function validatePublish(
  filterCriteria: { builds?: string[]; cars?: string[]; tags?: string[] },
  cars: BindingCar[],
): Promise<string[]> {
  const errors: string[] = [];

  if (filterCriteria.builds?.length) {
    const existingBuilds = await PtcBuild.find({
      $or: [
        { build_id: { $in: filterCriteria.builds } },
        { version_tag: { $in: filterCriteria.builds } },
      ],
    }).lean();
    const found = new Set([
      ...existingBuilds.map((b) => b.build_id),
      ...existingBuilds.map((b) => b.version_tag),
    ]);
    const invalid = filterCriteria.builds.filter((b) => !found.has(b));
    if (invalid.length) errors.push(`Builds not found: ${invalid.join(', ')}`);
  }

  if (cars.length && errors.length === 0) {
    const driveFilter: Record<string, unknown> = {};
    if (filterCriteria.builds?.length) {
      const buildDocs = await PtcBuild.find({
        $or: [
          { build_id: { $in: filterCriteria.builds } },
          { version_tag: { $in: filterCriteria.builds } },
        ],
      }).lean();
      driveFilter.build_id = { $in: buildDocs.map((b) => b.build_id) };
    }
    if (filterCriteria.tags?.length) driveFilter.tag_id = { $in: filterCriteria.tags };
    if (filterCriteria.cars?.length) driveFilter.car_id = { $in: filterCriteria.cars };

    if (Object.keys(driveFilter).length) {
      const validDriveIds = new Set(
        (await PtcDrive.find(driveFilter).select('drive_id').lean()).map((d) => d.drive_id),
      );
      for (const car of cars) {
        const invalidDrives = car.drives.filter((d) => d.selected && !validDriveIds.has(d.drive_id));
        if (invalidDrives.length) {
          errors.push(`Car ${car.car_id}: ${invalidDrives.length} drive(s) not matching filter`);
        }
      }
    }
  }

  return errors;
}

const router = Router();

router.get('/bindings', asyncHandler(async (req: Request, res: Response) => {
  const { project_id, task_id, status } = req.query;
  const filter: Record<string, unknown> = {};
  if (task_id && typeof task_id === 'string') {
    filter.task_id = task_id;
  }
  if (status && typeof status === 'string') {
    filter.status = status;
  }
  if (project_id && typeof project_id === 'string') {
    const tasks = await PtcTask.find({ project_id }).select('task_id').lean();
    filter.task_id = { $in: tasks.map((t) => t.task_id) };
  }
  const bindings = await PtcBinding.find(filter).sort({ updated_at: -1 }).lean();
  res.json(bindings);
}));

router.get('/bindings/:id', asyncHandler(async (req: Request, res: Response) => {
  const binding = await PtcBinding.findOne({ binding_id: req.params.id }).lean();
  if (!binding) {
    res.status(404).json({ error: 'Binding not found' });
    return;
  }

  const carIds = binding.cars.map((c) => c.car_id);
  const driveIds = binding.cars.flatMap((c) => c.drives.map((d) => d.drive_id));

  const [drives] = await Promise.all([
    PtcDrive.find({ drive_id: { $in: driveIds } }).lean(),
  ]);

  const driveMap = new Map(drives.map((d) => [d.drive_id, d]));

  const enrichedCars = binding.cars.map((car) => ({
    ...car,
    drives: car.drives.map((d) => ({
      ...d,
      detail: driveMap.get(d.drive_id) || null,
    })),
  }));

  res.json({ ...binding, cars: enrichedCars });
}));

router.post('/bindings', asyncHandler(async (req: Request, res: Response) => {
  const { task_id, filter_criteria, car_ids, cars: providedCars, status } = req.body;

  if (!task_id) {
    res.status(400).json({ error: 'task_id is required' });
    return;
  }

  const task = await PtcTask.findOne({ task_id });
  if (!task) {
    res.status(400).json({ error: `Task '${task_id}' does not exist` });
    return;
  }

  const existing = await PtcBinding.findOne({ task_id });
  if (existing) {
    res.status(409).json({ error: `Binding already exists for task '${task_id}'` });
    return;
  }

  const criteria = filter_criteria || { builds: [], cars: [], tags: [] };
  let cars;

  if (Array.isArray(providedCars) && providedCars.length > 0) {
    cars = providedCars;
  } else {
    const driveFilter: Record<string, unknown> = {};
    if (criteria.builds?.length) driveFilter.build_id = { $in: criteria.builds };
    if (criteria.cars?.length) driveFilter.car_id = { $in: criteria.cars };
    if (criteria.tags?.length) driveFilter.tag_id = { $in: criteria.tags };

    let drives = await PtcDrive.find(driveFilter).lean();

    if (car_ids?.length) {
      drives = drives.filter((d) => car_ids.includes(d.car_id));
    }

    const carDriveMap = new Map<string, string[]>();
    for (const d of drives) {
      const arr = carDriveMap.get(d.car_id) || [];
      arr.push(d.drive_id);
      carDriveMap.set(d.car_id, arr);
    }

    cars = Array.from(carDriveMap.entries()).map(([car_id, driveIds]) => ({
      car_id,
      drives: driveIds.map((drive_id) => ({ drive_id, selected: true })),
    }));
  }

  const finalStatus = status || 'Draft';

  if (finalStatus === 'Published') {
    const errors = await validatePublish(criteria, cars);
    if (errors.length) {
      res.status(400).json({ error: 'Publish validation failed', details: errors });
      return;
    }
  }

  const binding = new PtcBinding({
    binding_id: `ptc-bind-${crypto.randomUUID().slice(0, 8)}`,
    task_id,
    status: finalStatus,
    filter_criteria: criteria,
    cars,
  });
  await binding.save();
  res.status(201).json(binding);
}));

router.put('/bindings/:id', asyncHandler(async (req: Request, res: Response) => {
  const { status, filter_criteria, cars } = req.body;

  if (status === 'Published') {
    const existing = await PtcBinding.findOne({ binding_id: req.params.id }).lean();
    if (!existing) {
      res.status(404).json({ error: 'Binding not found' });
      return;
    }
    const criteria = filter_criteria || existing.filter_criteria || { builds: [], cars: [], tags: [] };
    const bindingCars = cars || existing.cars || [];
    const errors = await validatePublish(criteria, bindingCars);
    if (errors.length) {
      res.status(400).json({ error: 'Publish validation failed', details: errors });
      return;
    }
  }

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (filter_criteria) updates.filter_criteria = filter_criteria;
  if (cars) updates.cars = cars;

  const binding = await PtcBinding.findOneAndUpdate(
    { binding_id: req.params.id },
    updates,
    { new: true },
  ).lean();
  if (!binding) {
    res.status(404).json({ error: 'Binding not found' });
    return;
  }
  res.json(binding);
}));

router.put('/bindings/:id/drives', asyncHandler(async (req: Request, res: Response) => {
  const { car_id, drive_updates } = req.body;
  if (!car_id || !Array.isArray(drive_updates)) {
    res.status(400).json({ error: 'car_id and drive_updates[] are required' });
    return;
  }

  const binding = await PtcBinding.findOne({ binding_id: req.params.id });
  if (!binding) {
    res.status(404).json({ error: 'Binding not found' });
    return;
  }

  const car = binding.cars.find((c) => c.car_id === car_id);
  if (!car) {
    res.status(404).json({ error: `Car '${car_id}' not found in this binding` });
    return;
  }

  for (const update of drive_updates) {
    const drive = car.drives.find((d) => d.drive_id === update.drive_id);
    if (drive) {
      drive.selected = update.selected ?? drive.selected;
      if (!drive.selected) {
        drive.deselect_reason_preset = update.deselect_reason_preset || drive.deselect_reason_preset;
        drive.deselect_reason_text = update.deselect_reason_text || drive.deselect_reason_text;
      } else {
        drive.deselect_reason_preset = undefined;
        drive.deselect_reason_text = undefined;
      }
    }
  }

  await binding.save();
  res.json(binding);
}));

router.delete('/bindings/:id', asyncHandler(async (req: Request, res: Response) => {
  const result = await PtcBinding.deleteOne({ binding_id: req.params.id });
  if (result.deletedCount === 0) {
    res.status(404).json({ error: 'Binding not found' });
    return;
  }
  res.json({ deleted: true });
}));

export default router;
