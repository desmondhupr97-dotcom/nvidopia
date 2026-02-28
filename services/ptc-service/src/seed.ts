import mongoose from 'mongoose';
import {
  PtcProject, PtcTask, PtcBinding, PtcBuild, PtcCar, PtcTag, PtcDrive,
} from '@nvidopia/data-models';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nvidopia';

const PROJECT_NAMES = ['R17', 'R18', 'P20', 'S25', 'X30', 'Q15', 'T22'];

const TASK_TEMPLATES = [
  'PMB_Driving', 'L2_Highway', 'L2_Urban', 'L3_Highway', 'L3_Urban',
  'Stabilization', 'Regression', 'Smoke_Test', 'Gray_Release', 'Night_Drive',
];

const TAG_NAMES = [
  'L2+ Stabilization', 'L2+ PMB', 'L3 Urban', 'L3 Highway',
  'Smoke Test', 'Gray Release', 'Night Mode', 'Rain Test',
  'Highway Merge', 'Parking Assist',
];

const ROUTES = [
  'LA-SD Highway', 'Bay Area Loop', 'SF Downtown', 'LA Urban Grid',
  'SD Coastal', 'Silicon Valley', 'Sacramento I-80', 'Napa Valley',
  null, null,
];

const ROAD_TYPES = ['Highway', 'Urban', 'Ramp', 'Rural'] as const;
const ROAD_TYPE_WEIGHTS = [0.45, 0.30, 0.10, 0.15];

function pickWeighted<T>(items: readonly T[], weights: number[]): T {
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < items.length; i++) {
    cum += weights[i];
    if (r <= cum) return items[i];
  }
  return items[items.length - 1];
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function generateDriveKpiFields(mileageKm: number, roadType: string) {
  const isHighway = roadType === 'Highway';
  const isUrban = roadType === 'Urban';
  const isRamp = roadType === 'Ramp';

  const hwFrac = isHighway ? 0.85 + Math.random() * 0.1 : isUrban ? 0.05 + Math.random() * 0.05 : isRamp ? 0.3 + Math.random() * 0.2 : 0.1 + Math.random() * 0.1;
  const cityFrac = isUrban ? 0.75 + Math.random() * 0.1 : isHighway ? 0.02 + Math.random() * 0.03 : 0.15 + Math.random() * 0.15;
  const rampFrac = isRamp ? 0.5 + Math.random() * 0.2 : 0.02 + Math.random() * 0.03;
  const ruralFrac = Math.max(0, 1 - hwFrac - cityFrac - rampFrac);

  const highway_mileage = round2(mileageKm * hwFrac);
  const city_mileage = round2(mileageKm * cityFrac);
  const ramp_mileage = round2(mileageKm * rampFrac);
  const rural_road_mileage = round2(Math.max(0, mileageKm - highway_mileage - city_mileage - ramp_mileage));

  const l2pFrac = 0.5 + Math.random() * 0.3;
  const accLkFrac = 0.1 + Math.random() * 0.2;
  const accFrac = 0.05 + Math.random() * 0.1;
  const manualFrac = Math.max(0, 1 - l2pFrac - accLkFrac - accFrac);

  const l2p_mileage = round2(mileageKm * l2pFrac);
  const l2pp_mileage = round2(l2p_mileage * (0.8 + Math.random() * 0.2));
  const acc_lk_mileage = round2(mileageKm * accLkFrac);
  const acc_mileage = round2(mileageKm * accFrac);
  const manual_mileage = round2(Math.max(0, mileageKm - l2p_mileage - acc_lk_mileage - acc_mileage));

  const perKm = mileageKm / 100;

  return {
    road_type: roadType,
    l2pp_mileage,
    l2p_mileage,
    acc_lk_mileage,
    acc_mileage,
    manual_mileage,
    city_mileage,
    highway_mileage,
    ramp_mileage,
    rural_road_mileage,

    toll_station_count: isHighway ? randomInt(0, 3) : 0,
    intersection_count: isUrban ? randomInt(2, 15) : isHighway ? randomInt(0, 2) : randomInt(0, 5),
    tfl_count: isUrban ? randomInt(1, 10) : randomInt(0, 3),
    left_turn_count: randomInt(0, isUrban ? 12 : 4),
    right_turn_count: randomInt(0, isUrban ? 12 : 4),

    safety_takeover_count: Math.random() < 0.15 ? randomInt(1, 3) : 0,
    silc_miss_route_count: Math.random() < 0.08 ? 1 : 0,
    wobble_count: Math.random() < 0.1 ? randomInt(1, 2) : 0,
    ghost_brake_count: Math.random() < 0.12 ? randomInt(1, 2) : 0,
    gb_harsh_count: Math.random() < 0.06 ? 1 : 0,
    dangerous_lc_count: Math.random() < 0.05 ? 1 : 0,
    lane_drift_count: Math.random() < 0.08 ? randomInt(1, 2) : 0,
    lateral_position_count: Math.random() < 0.12 ? randomInt(1, 3) : 0,
    atca_fn_count: Math.random() < 0.04 ? 1 : 0,
    atca_fp_count: Math.random() < 0.03 ? 1 : 0,

    xl_longitudinal_count: Math.random() < 0.08 ? randomInt(1, 2) : 0,
    l_longitudinal_count: Math.random() < 0.12 ? randomInt(1, 3) : 0,
    ml_longitudinal_count: Math.random() < 0.15 ? randomInt(1, 3) : 0,
    m_longitudinal_count: Math.random() < 0.18 ? randomInt(1, 4) : 0,
    xl_lateral_count: Math.random() < 0.06 ? 1 : 0,
    l_lateral_count: Math.random() < 0.1 ? randomInt(1, 2) : 0,
    ml_lateral_count: Math.random() < 0.12 ? randomInt(1, 3) : 0,

    entry_ramp_attempts: isHighway || isRamp ? randomInt(1, 4) : 0,
    entry_ramp_successes: 0,
    exit_ramp_attempts: isHighway || isRamp ? randomInt(1, 4) : 0,
    exit_ramp_successes: 0,
  };
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(startDays: number, endDays: number): Date {
  const now = Date.now();
  const start = now - startDays * 86400000;
  const end = now - endDays * 86400000;
  return new Date(start + Math.random() * (end - start));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected. Clearing existing PTC data...');

  await Promise.all([
    PtcProject.deleteMany({}),
    PtcTask.deleteMany({}),
    PtcBinding.deleteMany({}),
    PtcBuild.deleteMany({}),
    PtcCar.deleteMany({}),
    PtcTag.deleteMany({}),
    PtcDrive.deleteMany({}),
  ]);

  // --- Builds ---
  const builds = [];
  for (let i = 0; i < 20; i++) {
    const buildId = `${10000 + randomInt(0, 89999)}`;
    builds.push({
      build_id: buildId,
      version_tag: `v${randomInt(1, 5)}.${randomInt(0, 9)}.${randomInt(0, 99)}`,
      build_time: randomDate(90, 1),
    });
  }
  await PtcBuild.insertMany(builds);
  console.log(`  Inserted ${builds.length} builds`);

  // --- Cars ---
  const cars: Array<{ car_id: string; name: string; vin: string }> = [];
  for (let i = 0; i < 30; i++) {
    const carId = `${200 + i}`;
    cars.push({
      car_id: carId,
      name: `ATG-${String.fromCharCode(65 + (i % 4))} UX-${3600 + i}`,
      vin: `W1K6G7GB${String(randomInt(10000000, 99999999))}`,
    });
  }
  await PtcCar.insertMany(cars);
  console.log(`  Inserted ${cars.length} cars`);

  // --- Tags ---
  const tags = TAG_NAMES.map((name, i) => ({
    tag_id: `tag-${String(i + 1).padStart(3, '0')}`,
    name,
  }));
  await PtcTag.insertMany(tags);
  console.log(`  Inserted ${tags.length} tags`);

  // --- Projects & Tasks ---
  const allProjects = [];
  const allTasks = [];

  for (let pi = 0; pi < PROJECT_NAMES.length; pi++) {
    const projectId = `ptc-proj-${String(pi + 1).padStart(4, '0')}`;
    allProjects.push({ project_id: projectId, name: PROJECT_NAMES[pi] });

    const taskCount = randomInt(5, 10);
    const usedTemplates = new Set<string>();
    for (let ti = 0; ti < taskCount; ti++) {
      let template: string;
      do {
        template = pick(TASK_TEMPLATES);
      } while (usedTemplates.has(template));
      usedTemplates.add(template);

      allTasks.push({
        task_id: `ptc-task-${String(pi + 1).padStart(2, '0')}${String(ti + 1).padStart(2, '0')}`,
        project_id: projectId,
        name: `${PROJECT_NAMES[pi]}_${template}`,
      });
    }
  }

  await PtcProject.insertMany(allProjects);
  await PtcTask.insertMany(allTasks);
  console.log(`  Inserted ${allProjects.length} projects, ${allTasks.length} tasks`);

  // --- Drives ---
  const allDrives: Array<Record<string, unknown>> = [];
  let driveCounter = 0;

  for (const task of allTasks) {
    const driveCount = randomInt(50, 100);
    const taskBuilds = [pick(builds), pick(builds), pick(builds)];
    const taskTags = [pick(tags), pick(tags)];
    const taskCars = Array.from({ length: randomInt(3, 8) }, () => pick(cars));

    for (let di = 0; di < driveCount; di++) {
      driveCounter++;
      const date = randomDate(30, 0);
      const startHour = randomInt(6, 18);
      const durationHours = randomInt(1, 6);
      const startTime = new Date(date);
      startTime.setHours(startHour, randomInt(0, 59), 0, 0);
      const endTime = new Date(startTime.getTime() + durationHours * 3600000);
      const mileage_km = round2(randomInt(10, 300) + Math.random());
      const roadType = pickWeighted(ROAD_TYPES, ROAD_TYPE_WEIGHTS);
      const kpiFields = generateDriveKpiFields(mileage_km, roadType);

      // Fill ramp successes based on attempts (70-95% success rate)
      if (kpiFields.entry_ramp_attempts > 0) {
        const rate = 0.7 + Math.random() * 0.25;
        kpiFields.entry_ramp_successes = Math.min(
          kpiFields.entry_ramp_attempts,
          Math.round(kpiFields.entry_ramp_attempts * rate),
        );
      }
      if (kpiFields.exit_ramp_attempts > 0) {
        const rate = 0.7 + Math.random() * 0.25;
        kpiFields.exit_ramp_successes = Math.min(
          kpiFields.exit_ramp_attempts,
          Math.round(kpiFields.exit_ramp_attempts * rate),
        );
      }

      allDrives.push({
        drive_id: `drv-${String(driveCounter).padStart(6, '0')}`,
        car_id: pick(taskCars).car_id,
        build_id: pick(taskBuilds).build_id,
        tag_id: pick(taskTags).tag_id,
        date,
        start_time: startTime,
        end_time: endTime,
        mileage_km,
        xl_events: randomInt(0, 5),
        l_events: randomInt(0, 15),
        hotline_count: randomInt(0, 4),
        route: pick(ROUTES),
        ...kpiFields,
      });
    }
  }

  // Batch insert drives (may be large)
  const BATCH_SIZE = 500;
  for (let i = 0; i < allDrives.length; i += BATCH_SIZE) {
    await PtcDrive.insertMany(allDrives.slice(i, i + BATCH_SIZE));
  }
  console.log(`  Inserted ${allDrives.length} drives`);

  // --- Bindings (roughly half of tasks get a binding) ---
  const allBindings = [];
  for (let i = 0; i < allTasks.length; i++) {
    if (Math.random() < 0.5) continue;

    const task = allTasks[i];
    const relevantDrives = allDrives.slice(
      allDrives.findIndex((d) => d.drive_id === `drv-${String(i * 75 + 1).padStart(6, '0')}`),
    ).slice(0, randomInt(20, 60));

    const carDriveMap = new Map<string, { drive_id: string; selected: boolean; deselect_reason_preset?: string; deselect_reason_text?: string }[]>();
    for (const d of relevantDrives) {
      if (!d) continue;
      const carId = d.car_id as string;
      const driveId = d.drive_id as string;
      const arr = carDriveMap.get(carId) || [];
      const selected = Math.random() > 0.1;
      arr.push({
        drive_id: driveId,
        selected,
        ...(!selected ? {
          deselect_reason_preset: pick(['数据异常', '重复', '不相关', '设备故障', '其他']),
          deselect_reason_text: Math.random() > 0.5 ? 'Auto-generated reason for testing' : undefined,
        } : {}),
      });
      carDriveMap.set(carId, arr);
    }

    allBindings.push({
      binding_id: `ptc-bind-${String(allBindings.length + 1).padStart(4, '0')}`,
      task_id: task.task_id,
      status: Math.random() > 0.4 ? 'Published' : 'Draft',
      filter_criteria: {
        builds: [pick(builds).build_id],
        cars: [],
        tags: [pick(tags).tag_id],
      },
      cars: Array.from(carDriveMap.entries()).map(([car_id, drives]) => ({ car_id, drives })),
    });
  }

  if (allBindings.length > 0) {
    await PtcBinding.insertMany(allBindings);
  }
  console.log(`  Inserted ${allBindings.length} bindings`);

  console.log('\nSeed complete!');
  console.log(`  Projects: ${allProjects.length}`);
  console.log(`  Tasks: ${allTasks.length}`);
  console.log(`  Builds: ${builds.length}`);
  console.log(`  Cars: ${cars.length}`);
  console.log(`  Tags: ${tags.length}`);
  console.log(`  Drives: ${allDrives.length}`);
  console.log(`  Bindings: ${allBindings.length}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
