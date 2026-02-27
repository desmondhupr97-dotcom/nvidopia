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
  const allDrives: Array<{
    drive_id: string; car_id: string; build_id: string; tag_id: string;
    date: Date; start_time: Date; end_time: Date; mileage_km: number;
    xl_events: number; l_events: number; hotline_count: number; route: string | null;
  }> = [];
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

      allDrives.push({
        drive_id: `drv-${String(driveCounter).padStart(6, '0')}`,
        car_id: pick(taskCars).car_id,
        build_id: pick(taskBuilds).build_id,
        tag_id: pick(taskTags).tag_id,
        date,
        start_time: startTime,
        end_time: endTime,
        mileage_km: Math.round((randomInt(10, 300) + Math.random()) * 100) / 100,
        xl_events: randomInt(0, 5),
        l_events: randomInt(0, 15),
        hotline_count: randomInt(0, 4),
        route: pick(ROUTES),
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
    const taskDrives = allDrives.filter(
      (d) => allDrives.some((ad) => ad.drive_id === d.drive_id),
    );
    const relevantDrives = allDrives.slice(
      allDrives.findIndex((d) => d.drive_id === `drv-${String(i * 75 + 1).padStart(6, '0')}`),
    ).slice(0, randomInt(20, 60));

    const carDriveMap = new Map<string, { drive_id: string; selected: boolean; deselect_reason_preset?: string; deselect_reason_text?: string }[]>();
    for (const d of relevantDrives) {
      if (!d) continue;
      const arr = carDriveMap.get(d.car_id) || [];
      const selected = Math.random() > 0.1;
      arr.push({
        drive_id: d.drive_id,
        selected,
        ...(!selected ? {
          deselect_reason_preset: pick(['数据异常', '重复', '不相关', '设备故障', '其他']),
          deselect_reason_text: Math.random() > 0.5 ? 'Auto-generated reason for testing' : undefined,
        } : {}),
      });
      carDriveMap.set(d.car_id, arr);
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
