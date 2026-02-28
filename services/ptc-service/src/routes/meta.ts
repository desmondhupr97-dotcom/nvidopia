import { Router, type Request, type Response } from 'express';
import { PtcBuild, PtcCar, PtcTag, PtcDrive, PtcProject, PtcTask, PtcBinding } from '@nvidopia/data-models';
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

router.get('/meta/options', asyncHandler(async (req: Request, res: Response) => {
  const { builds, tags, cars } = req.query;
  const buildIds = (builds && typeof builds === 'string') ? builds.split(',') : [];
  const tagIds = (tags && typeof tags === 'string') ? tags.split(',') : [];
  const carIds = (cars && typeof cars === 'string') ? cars.split(',') : [];

  const buildFilter: Record<string, unknown> = {};
  if (tagIds.length) buildFilter.tag_id = { $in: tagIds };
  if (carIds.length) buildFilter.car_id = { $in: carIds };
  const availBuildIds = Object.keys(buildFilter).length
    ? await PtcDrive.distinct('build_id', buildFilter)
    : null;

  const tagFilter: Record<string, unknown> = {};
  if (buildIds.length) tagFilter.build_id = { $in: buildIds };
  if (carIds.length) tagFilter.car_id = { $in: carIds };
  const availTagIds = Object.keys(tagFilter).length
    ? await PtcDrive.distinct('tag_id', tagFilter)
    : null;

  const carFilter: Record<string, unknown> = {};
  if (buildIds.length) carFilter.build_id = { $in: buildIds };
  if (tagIds.length) carFilter.tag_id = { $in: tagIds };
  const availCarIds = Object.keys(carFilter).length
    ? await PtcDrive.distinct('car_id', carFilter)
    : null;

  const [availBuilds, availTags, availCars] = await Promise.all([
    availBuildIds
      ? PtcBuild.find({ build_id: { $in: availBuildIds } }).sort({ build_time: -1 }).lean()
      : PtcBuild.find().sort({ build_time: -1 }).lean(),
    availTagIds
      ? PtcTag.find({ tag_id: { $in: availTagIds } }).sort({ name: 1 }).lean()
      : PtcTag.find().sort({ name: 1 }).lean(),
    availCarIds
      ? PtcCar.find({ car_id: { $in: availCarIds } }).sort({ car_id: 1 }).lean()
      : PtcCar.find().sort({ car_id: 1 }).lean(),
  ]);

  res.json({ builds: availBuilds, tags: availTags, cars: availCars });
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
    { $sort: { date: -1 } },
    {
      $group: {
        _id: '$car_id',
        drive_count: { $sum: 1 },
        total_mileage: { $sum: '$mileage_km' },
        hotline_count: { $sum: '$hotline_count' },
        builds: { $addToSet: '$build_id' },
        tags: { $addToSet: '$tag_id' },
        min_date: { $min: '$date' },
        max_date: { $max: '$date' },
        drives: {
          $push: {
            drive_id: '$drive_id',
            date: '$date',
            mileage_km: '$mileage_km',
            start_time: '$start_time',
            end_time: '$end_time',
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json(result.map((r) => ({
    car_id: r._id,
    drive_count: r.drive_count,
    total_mileage: r.total_mileage,
    hotline_count: r.hotline_count,
    builds: r.builds,
    tags: r.tags,
    date_range: { start: r.min_date, end: r.max_date },
    drives: r.drives,
  })));
}));

router.post('/seed', asyncHandler(async (req: Request, res: Response) => {
  const force = req.query.force === 'true';
  const existingBuilds = await PtcBuild.countDocuments();
  if (existingBuilds > 0 && !force) {
    res.json({ message: 'Already seeded', builds: existingBuilds });
    return;
  }
  if (force) {
    await Promise.all([
      PtcBuild.deleteMany({}), PtcCar.deleteMany({}), PtcTag.deleteMany({}),
      PtcDrive.deleteMany({}), PtcBinding.deleteMany({}), PtcTask.deleteMany({}),
      PtcProject.deleteMany({}),
    ]);
  }

  function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
  function randomDate(startDays: number, endDays: number): Date {
    const now = Date.now();
    return new Date(now - startDays * 86400000 + Math.random() * (startDays - endDays) * 86400000);
  }

  const TAG_NAMES = ['L2+ Stabilization','L2+ PMB','L3 Urban','L3 Highway','Smoke Test','Gray Release','Night Mode','Rain Test','Highway Merge','Parking Assist'];
  const ROUTES: (string|null)[] = ['LA-SD Highway','Bay Area Loop','SF Downtown','LA Urban Grid','SD Coastal',null,null];
  const TASK_TEMPLATES = ['PMB_Driving','L2_Highway','L2_Urban','L3_Highway','Stabilization','Regression','Smoke_Test'];

  const builds = Array.from({ length: 20 }, (_, i) => ({
    build_id: `${10000 + randomInt(0, 89999)}`,
    version_tag: `v${randomInt(1,5)}.${randomInt(0,9)}.${randomInt(0,99)}`,
    build_time: randomDate(90, 1),
  }));
  await PtcBuild.insertMany(builds);

  const cars = Array.from({ length: 30 }, (_, i) => ({
    car_id: `${200 + i}`,
    name: `ATG-${String.fromCharCode(65 + (i % 4))} UX-${3600 + i}`,
    vin: `W1K6G7GB${randomInt(10000000, 99999999)}`,
  }));
  await PtcCar.insertMany(cars);

  const tags = TAG_NAMES.map((name, i) => ({ tag_id: `tag-${String(i+1).padStart(3,'0')}`, name }));
  await PtcTag.insertMany(tags);

  const PROJECT_NAMES = ['R17','R18','P20','S25','X30'];
  let projects = await PtcProject.find().lean();
  if (projects.length === 0) {
    const newProjs = PROJECT_NAMES.map((name, i) => ({
      project_id: `ptc-proj-${String(i+1).padStart(4,'0')}`,
      name,
    }));
    await PtcProject.insertMany(newProjs);
    projects = await PtcProject.find().lean();
  }

  const allDrives: Array<Record<string,unknown>> = [];
  const allBindings: Array<Record<string,unknown>> = [];
  let dc = 0;
  for (const proj of projects) {
    const taskCount = randomInt(3, 5);
    const used = new Set<string>();
    const tasksToInsert: Array<{ task_id: string; project_id: string; name: string }> = [];
    for (let ti = 0; ti < taskCount; ti++) {
      let tmpl: string;
      do { tmpl = pick(TASK_TEMPLATES); } while (used.has(tmpl));
      used.add(tmpl);
      const taskName = `${proj.name}_${tmpl}`;
      tasksToInsert.push({
        task_id: `ptc-task-${String(dc++).padStart(4,'0')}`,
        project_id: proj.project_id,
        name: taskName,
      });
    }
    await PtcTask.insertMany(tasksToInsert, { ordered: false }).catch(() => {});
    const projTasks = await PtcTask.find({ project_id: proj.project_id }).lean();
    for (const task of projTasks) {
      const driveCount = randomInt(5, 12);
      const tBuilds = [pick(builds), pick(builds)];
      const tTags = [pick(tags), pick(tags)];
      const tCars = Array.from({ length: randomInt(2, 4) }, () => pick(cars));
      for (let di = 0; di < driveCount; di++) {
        dc++;
        const date = randomDate(30, 0);
        const sH = randomInt(6, 18);
        const st = new Date(date); st.setHours(sH, randomInt(0,59), 0, 0);
        const et = new Date(st.getTime() + randomInt(1,5)*3600000);
        const mileage_km = Math.round((randomInt(10,300)+Math.random())*100)/100;
        const ROAD_TYPES = ['Highway','Urban','Ramp','Rural'] as const;
        const roadType = pick([...ROAD_TYPES]);
        const isHighway = roadType === 'Highway';
        const isUrban = roadType === 'Urban';
        const isRamp = roadType === 'Ramp';
        const r2 = (v: number) => Math.round(v * 100) / 100;

        const hwFrac = isHighway ? 0.85 + Math.random() * 0.1 : isUrban ? 0.05 : isRamp ? 0.35 : 0.15;
        const cityFrac = isUrban ? 0.8 : isHighway ? 0.03 : 0.15;
        const rampFrac = isRamp ? 0.55 : 0.03;
        const ruralFrac = Math.max(0, 1 - hwFrac - cityFrac - rampFrac);
        const l2pFrac = 0.5 + Math.random() * 0.3;
        const accLkFrac = 0.1 + Math.random() * 0.15;
        const accFrac = 0.05 + Math.random() * 0.1;

        allDrives.push({
          drive_id: `drv-${String(dc).padStart(6,'0')}`,
          car_id: pick(tCars).car_id, build_id: pick(tBuilds).build_id, tag_id: pick(tTags).tag_id,
          date, start_time: st, end_time: et,
          mileage_km,
          xl_events: randomInt(0,5), l_events: randomInt(0,15), hotline_count: randomInt(0,4),
          route: pick(ROUTES),
          road_type: roadType,
          l2pp_mileage: r2(mileage_km * l2pFrac * 0.9),
          l2p_mileage: r2(mileage_km * l2pFrac),
          acc_lk_mileage: r2(mileage_km * accLkFrac),
          acc_mileage: r2(mileage_km * accFrac),
          manual_mileage: r2(Math.max(0, mileage_km * (1 - l2pFrac - accLkFrac - accFrac))),
          city_mileage: r2(mileage_km * cityFrac),
          highway_mileage: r2(mileage_km * hwFrac),
          ramp_mileage: r2(mileage_km * rampFrac),
          rural_road_mileage: r2(mileage_km * ruralFrac),
          toll_station_count: isHighway ? randomInt(0,2) : 0,
          intersection_count: isUrban ? randomInt(2,10) : randomInt(0,3),
          tfl_count: isUrban ? randomInt(1,8) : randomInt(0,2),
          left_turn_count: randomInt(0, isUrban ? 10 : 3),
          right_turn_count: randomInt(0, isUrban ? 10 : 3),
          safety_takeover_count: Math.random() < 0.15 ? randomInt(1,2) : 0,
          silc_miss_route_count: Math.random() < 0.08 ? 1 : 0,
          wobble_count: Math.random() < 0.1 ? randomInt(1,2) : 0,
          ghost_brake_count: Math.random() < 0.12 ? randomInt(1,2) : 0,
          gb_harsh_count: Math.random() < 0.06 ? 1 : 0,
          dangerous_lc_count: Math.random() < 0.05 ? 1 : 0,
          lane_drift_count: Math.random() < 0.08 ? randomInt(1,2) : 0,
          lateral_position_count: Math.random() < 0.12 ? randomInt(1,3) : 0,
          atca_fn_count: Math.random() < 0.04 ? 1 : 0,
          atca_fp_count: Math.random() < 0.03 ? 1 : 0,
          xl_longitudinal_count: Math.random() < 0.08 ? randomInt(1,2) : 0,
          l_longitudinal_count: Math.random() < 0.12 ? randomInt(1,3) : 0,
          ml_longitudinal_count: Math.random() < 0.15 ? randomInt(1,3) : 0,
          m_longitudinal_count: Math.random() < 0.18 ? randomInt(1,4) : 0,
          xl_lateral_count: Math.random() < 0.06 ? 1 : 0,
          l_lateral_count: Math.random() < 0.1 ? randomInt(1,2) : 0,
          ml_lateral_count: Math.random() < 0.12 ? randomInt(1,3) : 0,
          entry_ramp_attempts: isHighway || isRamp ? randomInt(1,3) : 0,
          entry_ramp_successes: isHighway || isRamp ? randomInt(0,3) : 0,
          exit_ramp_attempts: isHighway || isRamp ? randomInt(1,3) : 0,
          exit_ramp_successes: isHighway || isRamp ? randomInt(0,3) : 0,
        });
      }
      if (Math.random() < 0.6) {
        const taskDrives = allDrives.slice(-driveCount);
        const carMap = new Map<string, Array<{drive_id:string;selected:boolean;deselect_reason_preset?:string}>>();
        for (const d of taskDrives) {
          const arr = carMap.get(d.car_id as string) || [];
          const sel = Math.random() > 0.1;
          arr.push({ drive_id: d.drive_id as string, selected: sel, ...(!sel ? { deselect_reason_preset: pick(['数据异常','重复','不相关','设备故障','其他']) } : {}) });
          carMap.set(d.car_id as string, arr);
        }
        allBindings.push({
          binding_id: `ptc-bind-${String(dc).padStart(4,'0')}`,
          task_id: task.task_id,
          status: Math.random() > 0.4 ? 'Published' : 'Draft',
          filter_criteria: { builds: [pick(builds).build_id], cars: [], tags: [pick(tags).tag_id] },
          cars: Array.from(carMap.entries()).map(([car_id, drives]) => ({ car_id, drives })),
        });
      }
    }
  }
  if (allBindings.length > 0) {
    await PtcBinding.insertMany(allBindings);
  }
  if (allDrives.length > 0) {
    await PtcDrive.insertMany(allDrives);
  }

  res.json({ message: 'Seed complete', projects: projects.length, drives: allDrives.length, builds: builds.length, cars: cars.length, tags: tags.length });
}));

export default router;
