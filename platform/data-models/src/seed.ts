/**
 * Seed script — populates MongoDB with realistic test data for the nvidopia platform.
 *
 * Usage:  npx tsx platform/data-models/src/seed.ts
 *
 * Env:    MONGO_URI  (default: mongodb://nvidopia:nvidopia_dev@localhost:27017/nvidopia?authSource=admin)
 */

import mongoose from 'mongoose';
import { Project } from './project.model.js';
import { Task } from './task.model.js';
import { Run } from './run.model.js';
import { Issue } from './issue.model.js';
import { IssueStateTransition } from './issue-state-transition.model.js';
import { Requirement } from './requirement.model.js';
import { Commit } from './commit.model.js';
import { Build } from './build.model.js';
import { Vehicle } from './vehicle.model.js';
import { KpiSnapshot } from './kpi-snapshot.model.js';
import { IssueTimeSeries } from './issue-timeseries.model.js';
import { KpiDefinition } from './kpi-definition.model.js';
import { VehicleTrajectory } from './vehicle-trajectory.model.js';
import { VehicleStatusSegment } from './vehicle-status-segment.model.js';
import { PtcProject } from './ptc-project.model.js';
import { PtcTask } from './ptc-task.model.js';
import { PtcBinding } from './ptc-binding.model.js';
import { PtcBuild } from './ptc-build.model.js';
import { PtcCar } from './ptc-car.model.js';
import { PtcTag } from './ptc-tag.model.js';
import { PtcDrive } from './ptc-drive.model.js';

const MONGO_URI =
  process.env.MONGO_URI ??
  'mongodb://nvidopia:nvidopia_dev@localhost:27017/nvidopia?authSource=admin';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seed(): Promise<void> {
  await mongoose.connect(MONGO_URI);
  console.log('[seed] Connected to MongoDB');

  // Drop existing collections for idempotent re-seeding
  const collections = [
    'projects', 'tasks', 'runs', 'issues', 'issuestatetransitions',
    'requirements', 'commits', 'builds', 'vehicles', 'kpisnapshots',
    'issuetimeseries', 'kpidefinitions', 'vehicletrajectories', 'vehiclestatussegments',
    'ptc_projects', 'ptc_tasks', 'ptc_bindings', 'ptc_builds', 'ptc_cars', 'ptc_tags', 'ptc_drives',
  ];
  for (const name of collections) {
    try { await mongoose.connection.db!.dropCollection(name); } catch { /* may not exist */ }
  }
  console.log('[seed] Cleared existing collections');

  // -------------------------------------------------------------------------
  // Projects (2)
  // -------------------------------------------------------------------------
  const projects = await Project.insertMany([
    {
      project_id: 'PROJ-001',
      name: 'V2.0 Urban Pilot',
      vehicle_platform: 'ORIN-X',
      soc_architecture: 'dual-orin-x',
      sensor_suite_version: 'SS-4.2',
      software_baseline_version: 'v2.0.0-rc3',
      target_mileage_km: 500_000,
      start_date: daysAgo(90),
      status: 'Active',
    },
    {
      project_id: 'PROJ-002',
      name: 'V1.5 Highway Assist',
      vehicle_platform: 'ORIN',
      soc_architecture: 'single-orin',
      sensor_suite_version: 'SS-3.8',
      software_baseline_version: 'v1.5.2',
      target_mileage_km: 250_000,
      start_date: daysAgo(180),
      status: 'Active',
    },
  ]);
  console.log(`[seed] Inserted ${projects.length} projects`);

  // -------------------------------------------------------------------------
  // Tasks (6)
  // -------------------------------------------------------------------------
  const tasks = await Task.insertMany([
    {
      task_id: 'TASK-001',
      project_id: 'PROJ-001',
      name: 'Urban Daily Regression',
      task_type: 'Daily',
      priority: 'High',
      target_vehicle_count: 5,
      execution_region: 'Shanghai-Pudong',
      status: 'InProgress',
    },
    {
      task_id: 'TASK-002',
      project_id: 'PROJ-001',
      name: 'Urban Smoke Test',
      task_type: 'Smoke',
      priority: 'Critical',
      target_vehicle_count: 2,
      execution_region: 'Shanghai-Pudong',
      status: 'Completed',
    },
    {
      task_id: 'TASK-003',
      project_id: 'PROJ-001',
      name: 'Urban Gray Box Validation',
      task_type: 'Gray',
      priority: 'Medium',
      target_vehicle_count: 3,
      execution_region: 'Beijing-Haidian',
      status: 'Pending',
    },
    {
      task_id: 'TASK-004',
      project_id: 'PROJ-002',
      name: 'Highway Freeze Qualification',
      task_type: 'Freeze',
      priority: 'Critical',
      target_vehicle_count: 4,
      execution_region: 'G2-Highway',
      status: 'InProgress',
    },
    {
      task_id: 'TASK-005',
      project_id: 'PROJ-002',
      name: 'Highway Retest Campaign',
      task_type: 'Retest',
      priority: 'High',
      target_vehicle_count: 3,
      execution_region: 'G15-Highway',
      status: 'Pending',
    },
    {
      task_id: 'TASK-006',
      project_id: 'PROJ-002',
      name: 'Highway Daily Mileage',
      task_type: 'Daily',
      priority: 'Medium',
      target_vehicle_count: 5,
      execution_region: 'G2-Highway',
      status: 'InProgress',
    },
  ]);
  console.log(`[seed] Inserted ${tasks.length} tasks`);

  // -------------------------------------------------------------------------
  // Vehicles (5)
  // -------------------------------------------------------------------------
  const vehicles = await Vehicle.insertMany([
    {
      vin: 'VIN-ORINX-001',
      vehicle_platform: 'ORIN-X',
      sensor_suite_version: 'SS-4.2',
      soc_architecture: 'dual-orin-x',
      plate_type: 'permanent',
      model_code: 'EP32',
      component_versions: { lidar_fw: 'v2.1', camera_fw: 'v3.0', radar_fw: 'v1.8' },
      current_status: 'Active',
      last_heartbeat: daysAgo(0),
      current_location: { lat: 31.2304, lng: 121.4737 },
      current_speed_mps: 12.5,
      fuel_or_battery_level: 82,
      driving_mode: 'UrbanPilot',
    },
    {
      vin: 'VIN-ORINX-002',
      vehicle_platform: 'ORIN-X',
      sensor_suite_version: 'SS-4.2',
      soc_architecture: 'dual-orin-x',
      plate_type: 'temporary',
      model_code: 'EP32',
      component_versions: { lidar_fw: 'v2.1', camera_fw: 'v3.0', radar_fw: 'v1.8' },
      current_status: 'Idle',
      last_heartbeat: daysAgo(0),
      current_location: { lat: 31.2397, lng: 121.4998 },
      current_speed_mps: 0,
      fuel_or_battery_level: 95,
      driving_mode: 'Standby',
    },
    {
      vin: 'VIN-ORIN-003',
      vehicle_platform: 'ORIN',
      sensor_suite_version: 'SS-3.8',
      soc_architecture: 'single-orin',
      plate_type: 'permanent',
      model_code: 'ES33',
      component_versions: { lidar_fw: 'v1.9', camera_fw: 'v2.5', radar_fw: 'v1.6' },
      current_status: 'Active',
      last_heartbeat: daysAgo(0),
      current_location: { lat: 39.9042, lng: 116.4074 },
      current_speed_mps: 28.3,
      fuel_or_battery_level: 67,
      driving_mode: 'HighwayPilot',
    },
    {
      vin: 'VIN-ORIN-004',
      vehicle_platform: 'ORIN',
      sensor_suite_version: 'SS-3.8',
      soc_architecture: 'single-orin',
      plate_type: 'temporary',
      model_code: 'ES33',
      component_versions: { lidar_fw: 'v1.9', camera_fw: 'v2.5' },
      current_status: 'Maintenance',
      last_heartbeat: daysAgo(2),
      current_location: { lat: 39.9142, lng: 116.3974 },
      current_speed_mps: 0,
      fuel_or_battery_level: 45,
      driving_mode: 'Manual',
    },
    {
      vin: 'VIN-ORINX-005',
      vehicle_platform: 'ORIN-X',
      sensor_suite_version: 'SS-4.2',
      soc_architecture: 'dual-orin-x',
      plate_type: 'permanent',
      model_code: 'EP32',
      component_versions: { lidar_fw: 'v2.2', camera_fw: 'v3.1', radar_fw: 'v1.9' },
      current_status: 'Idle',
      last_heartbeat: daysAgo(1),
      current_location: { lat: 31.2244, lng: 121.4692 },
      current_speed_mps: 0,
      fuel_or_battery_level: 100,
      driving_mode: 'Standby',
    },
  ]);
  console.log(`[seed] Inserted ${vehicles.length} vehicles`);

  // -------------------------------------------------------------------------
  // Runs (10)
  // -------------------------------------------------------------------------
  const runs = await Run.insertMany([
    { run_id: 'RUN-001', task_id: 'TASK-001', vehicle_vin: 'VIN-ORINX-001', driver_id: 'DRV-A', start_time: daysAgo(5), end_time: daysAgo(5), total_auto_mileage_km: 142.3, software_version_hash: 'abc1234', status: 'Completed' },
    { run_id: 'RUN-002', task_id: 'TASK-001', vehicle_vin: 'VIN-ORINX-002', driver_id: 'DRV-B', start_time: daysAgo(4), end_time: daysAgo(4), total_auto_mileage_km: 98.7, software_version_hash: 'abc1234', status: 'Completed' },
    { run_id: 'RUN-003', task_id: 'TASK-002', vehicle_vin: 'VIN-ORINX-001', driver_id: 'DRV-A', start_time: daysAgo(10), end_time: daysAgo(10), total_auto_mileage_km: 55.0, software_version_hash: 'abc1234', status: 'Completed' },
    { run_id: 'RUN-004', task_id: 'TASK-002', vehicle_vin: 'VIN-ORINX-005', driver_id: 'DRV-C', start_time: daysAgo(10), end_time: daysAgo(10), total_auto_mileage_km: 62.1, software_version_hash: 'abc1234', status: 'Completed' },
    { run_id: 'RUN-005', task_id: 'TASK-004', vehicle_vin: 'VIN-ORIN-003', driver_id: 'DRV-D', start_time: daysAgo(7), end_time: daysAgo(7), total_auto_mileage_km: 210.5, software_version_hash: 'def5678', status: 'Completed' },
    { run_id: 'RUN-006', task_id: 'TASK-004', vehicle_vin: 'VIN-ORIN-004', driver_id: 'DRV-E', start_time: daysAgo(6), end_time: daysAgo(6), total_auto_mileage_km: 185.2, software_version_hash: 'def5678', status: 'Completed' },
    { run_id: 'RUN-007', task_id: 'TASK-006', vehicle_vin: 'VIN-ORIN-003', driver_id: 'DRV-D', start_time: daysAgo(3), end_time: daysAgo(3), total_auto_mileage_km: 320.0, software_version_hash: 'def5678', status: 'Completed' },
    { run_id: 'RUN-008', task_id: 'TASK-001', vehicle_vin: 'VIN-ORINX-001', driver_id: 'DRV-A', start_time: daysAgo(1), total_auto_mileage_km: 45.0, software_version_hash: 'abc1234', status: 'Active' },
    { run_id: 'RUN-009', task_id: 'TASK-006', vehicle_vin: 'VIN-ORIN-003', driver_id: 'DRV-D', start_time: daysAgo(1), total_auto_mileage_km: 78.3, software_version_hash: 'def5678', status: 'Active' },
    { run_id: 'RUN-010', task_id: 'TASK-004', vehicle_vin: 'VIN-ORIN-003', driver_id: 'DRV-D', start_time: daysAgo(14), end_time: daysAgo(14), total_auto_mileage_km: 195.0, software_version_hash: 'def5678', status: 'Completed' },
  ]);
  console.log(`[seed] Inserted ${runs.length} runs`);

  // -------------------------------------------------------------------------
  // Requirements (3) — HARA-derived safety requirements
  // -------------------------------------------------------------------------
  const requirements = await Requirement.insertMany([
    {
      req_id: 'REQ-HARA-001',
      asil_level: 'D',
      description: 'The ADS shall detect stationary obstacles within 150m at all speeds up to 120km/h and initiate braking to avoid collision.',
      source_system: 'DOORS',
      external_id: 'HARA-SG-042',
    },
    {
      req_id: 'REQ-HARA-002',
      asil_level: 'C',
      description: 'Lane-keeping assist shall maintain lateral position within 0.3m of lane center on highway curves with radius >= 250m.',
      source_system: 'DOORS',
      external_id: 'HARA-SG-078',
    },
    {
      req_id: 'REQ-HARA-003',
      asil_level: 'B',
      description: 'The perception module shall classify vulnerable road users (pedestrians, cyclists) with >= 99.5% recall at distances up to 80m.',
      source_system: 'DOORS',
      external_id: 'HARA-SG-113',
    },
  ]);
  console.log(`[seed] Inserted ${requirements.length} requirements`);

  // -------------------------------------------------------------------------
  // Commits (5) — linked to requirements and issues
  // -------------------------------------------------------------------------
  const commits = await Commit.insertMany([
    {
      commit_hash: 'abc1234',
      message: 'feat(perception): improve obstacle detection recall for stationary objects',
      author: 'alice@nvidopia.dev',
      branch: 'main',
      linked_req_ids: ['REQ-HARA-001', 'REQ-HARA-003'],
      linked_issue_ids: ['ISS-001', 'ISS-003'],
      created_at: daysAgo(30),
    },
    {
      commit_hash: 'def5678',
      message: 'fix(planning): correct lane-keeping PID gains for tight highway curves',
      author: 'bob@nvidopia.dev',
      branch: 'main',
      linked_req_ids: ['REQ-HARA-002'],
      linked_issue_ids: ['ISS-005'],
      created_at: daysAgo(25),
    },
    {
      commit_hash: 'ghi9012',
      message: 'refactor(prediction): unify trajectory prediction for VRU and vehicles',
      author: 'charlie@nvidopia.dev',
      branch: 'feature/vru-prediction',
      linked_req_ids: ['REQ-HARA-003'],
      linked_issue_ids: [],
      created_at: daysAgo(20),
    },
    {
      commit_hash: 'jkl3456',
      message: 'fix(chassis): increase brake actuator response timeout for emergency stops',
      author: 'alice@nvidopia.dev',
      branch: 'main',
      linked_req_ids: ['REQ-HARA-001'],
      linked_issue_ids: ['ISS-007', 'ISS-010'],
      created_at: daysAgo(15),
    },
    {
      commit_hash: 'mno7890',
      message: 'test(regression): add coverage for night-time pedestrian detection edge cases',
      author: 'diana@nvidopia.dev',
      branch: 'main',
      linked_req_ids: ['REQ-HARA-003'],
      linked_issue_ids: ['ISS-012'],
      created_at: daysAgo(10),
    },
  ]);
  console.log(`[seed] Inserted ${commits.length} commits`);

  // -------------------------------------------------------------------------
  // Builds (2)
  // -------------------------------------------------------------------------
  const builds = await Build.insertMany([
    {
      build_hash: 'BUILD-A001',
      version_tag: 'v2.0.0-rc3',
      commit_hashes: ['abc1234', 'ghi9012', 'jkl3456', 'mno7890'],
      build_time: daysAgo(12),
    },
    {
      build_hash: 'BUILD-B001',
      version_tag: 'v1.5.2',
      commit_hashes: ['def5678', 'jkl3456'],
      build_time: daysAgo(22),
    },
  ]);
  console.log(`[seed] Inserted ${builds.length} builds`);

  // -------------------------------------------------------------------------
  // Issues (20)
  // -------------------------------------------------------------------------
  const issues = await Issue.insertMany([
    { issue_id: 'ISS-001', run_id: 'RUN-001', trigger_timestamp: daysAgo(5), gps_coordinates: { lat: 31.230, lng: 121.474 }, category: 'Perception', severity: 'High', takeover_type: 'SystemFault', description: 'Missed detection of parked truck partially occluded by tree canopy', status: 'Fixed', assigned_to: 'alice@nvidopia.dev', assigned_module: 'perception', triage_mode: 'manual' },
    { issue_id: 'ISS-002', run_id: 'RUN-001', trigger_timestamp: daysAgo(5), gps_coordinates: { lat: 31.231, lng: 121.475 }, category: 'Planning', severity: 'Medium', description: 'Unnecessary lane change triggered near intersection', status: 'InProgress', assigned_to: 'bob@nvidopia.dev', assigned_module: 'planning', triage_mode: 'manual' },
    { issue_id: 'ISS-003', run_id: 'RUN-002', trigger_timestamp: daysAgo(4), gps_coordinates: { lat: 31.240, lng: 121.500 }, category: 'Perception', severity: 'Blocker', takeover_type: 'SystemFault', description: 'False positive ghost object on empty road segment — caused emergency brake', status: 'Closed', assigned_to: 'alice@nvidopia.dev', assigned_module: 'perception', triage_mode: 'manual' },
    { issue_id: 'ISS-004', run_id: 'RUN-002', trigger_timestamp: daysAgo(4), category: 'System', severity: 'Low', description: 'CAN bus heartbeat delay exceeded 200ms threshold briefly', status: 'Rejected', rejection_reason: 'Transient spike within acceptable limits', triage_mode: 'manual' },
    { issue_id: 'ISS-005', run_id: 'RUN-003', trigger_timestamp: daysAgo(10), gps_coordinates: { lat: 31.235, lng: 121.480 }, category: 'Planning', severity: 'High', takeover_type: 'Manual', description: 'Vehicle oscillated within lane on sharp urban curve (r < 50m)', status: 'Fixed', assigned_to: 'bob@nvidopia.dev', assigned_module: 'planning', fix_commit_id: 'def5678', triage_mode: 'manual' },
    { issue_id: 'ISS-006', run_id: 'RUN-003', trigger_timestamp: daysAgo(10), category: 'Prediction', severity: 'Medium', description: 'Predicted trajectory of cyclist did not account for sudden turn', status: 'Triage', triage_mode: 'manual' },
    { issue_id: 'ISS-007', run_id: 'RUN-004', trigger_timestamp: daysAgo(10), gps_coordinates: { lat: 31.225, lng: 121.469 }, category: 'Chassis', severity: 'Blocker', takeover_type: 'SystemFault', description: 'Brake actuator response exceeded 150ms SLA during AEB event', status: 'RegressionTracking', assigned_to: 'alice@nvidopia.dev', assigned_module: 'chassis', fix_commit_id: 'jkl3456', triage_mode: 'manual' },
    { issue_id: 'ISS-008', run_id: 'RUN-005', trigger_timestamp: daysAgo(7), gps_coordinates: { lat: 39.905, lng: 116.408 }, category: 'Perception', severity: 'Medium', takeover_type: 'Manual', description: 'Lidar point cloud dropout under heavy rain — 3 consecutive frames', status: 'Assigned', assigned_to: 'charlie@nvidopia.dev', assigned_module: 'perception', triage_mode: 'manual' },
    { issue_id: 'ISS-009', run_id: 'RUN-005', trigger_timestamp: daysAgo(7), category: 'Planning', severity: 'Low', description: 'Overly conservative merge gap acceptance on highway on-ramp', status: 'New', triage_mode: 'manual' },
    { issue_id: 'ISS-010', run_id: 'RUN-005', trigger_timestamp: daysAgo(7), gps_coordinates: { lat: 39.904, lng: 116.407 }, category: 'Chassis', severity: 'High', takeover_type: 'SystemFault', description: 'Steering torque sensor drift beyond calibration tolerance', status: 'Fixed', assigned_to: 'alice@nvidopia.dev', assigned_module: 'chassis', fix_commit_id: 'jkl3456', triage_mode: 'manual' },
    { issue_id: 'ISS-011', run_id: 'RUN-006', trigger_timestamp: daysAgo(6), category: 'System', severity: 'Medium', description: 'GPU thermal throttling observed above 85°C during sustained inference', status: 'InProgress', assigned_to: 'diana@nvidopia.dev', assigned_module: 'system', triage_mode: 'manual' },
    { issue_id: 'ISS-012', run_id: 'RUN-006', trigger_timestamp: daysAgo(6), gps_coordinates: { lat: 39.915, lng: 116.398 }, category: 'Perception', severity: 'High', takeover_type: 'Manual', description: 'Night-time pedestrian missed at crosswalk under broken streetlight', status: 'Closed', assigned_to: 'diana@nvidopia.dev', assigned_module: 'perception', fix_commit_id: 'mno7890', triage_mode: 'manual' },
    { issue_id: 'ISS-013', run_id: 'RUN-007', trigger_timestamp: daysAgo(3), category: 'Prediction', severity: 'Medium', description: 'Motorcycle cut-in prediction latency exceeded 300ms', status: 'Assigned', assigned_to: 'charlie@nvidopia.dev', assigned_module: 'prediction', triage_mode: 'manual' },
    { issue_id: 'ISS-014', run_id: 'RUN-007', trigger_timestamp: daysAgo(3), gps_coordinates: { lat: 39.906, lng: 116.410 }, category: 'Planning', severity: 'Low', description: 'Unnecessary speed reduction when passing large signage near highway shoulder', status: 'New', triage_mode: 'manual' },
    { issue_id: 'ISS-015', run_id: 'RUN-007', trigger_timestamp: daysAgo(3), category: 'Other', severity: 'Low', description: 'Map data mismatch: new construction zone not reflected in HD map', status: 'Triage', triage_mode: 'manual' },
    { issue_id: 'ISS-016', run_id: 'RUN-008', trigger_timestamp: daysAgo(1), gps_coordinates: { lat: 31.228, lng: 121.472 }, category: 'Perception', severity: 'High', takeover_type: 'SystemFault', description: 'Camera exposure saturation in low-sun glare conditions at dusk', status: 'New', triage_mode: 'manual' },
    { issue_id: 'ISS-017', run_id: 'RUN-008', trigger_timestamp: daysAgo(1), category: 'System', severity: 'Medium', description: 'Logging pipeline dropped telemetry packets under high throughput', status: 'New', triage_mode: 'manual' },
    { issue_id: 'ISS-018', run_id: 'RUN-009', trigger_timestamp: daysAgo(1), gps_coordinates: { lat: 39.907, lng: 116.411 }, category: 'Prediction', severity: 'High', takeover_type: 'Manual', description: 'Adjacent vehicle lane-change intent not detected until committed', status: 'Triage', triage_mode: 'manual' },
    { issue_id: 'ISS-019', run_id: 'RUN-010', trigger_timestamp: daysAgo(14), category: 'Planning', severity: 'Medium', description: 'Route replanning loop between two equally-weighted alternatives', status: 'Closed', assigned_to: 'bob@nvidopia.dev', assigned_module: 'planning', triage_mode: 'manual' },
    { issue_id: 'ISS-020', run_id: 'RUN-010', trigger_timestamp: daysAgo(14), gps_coordinates: { lat: 39.903, lng: 116.405 }, category: 'Perception', severity: 'Blocker', takeover_type: 'SystemFault', description: 'Lidar-camera fusion timestamp misalignment (>50ms delta)', status: 'Reopened', assigned_to: 'charlie@nvidopia.dev', assigned_module: 'perception', triage_mode: 'manual' },
  ]);
  console.log(`[seed] Inserted ${issues.length} issues`);

  // -------------------------------------------------------------------------
  // KPI Snapshots (sample pre-computed values)
  // -------------------------------------------------------------------------
  const kpiSnapshots = await KpiSnapshot.insertMany([
    { snapshot_id: 'KPI-001', metric_name: 'MPI', project_id: 'PROJ-001', value: 71.5, unit: 'km/intervention', window_start: daysAgo(14), window_end: daysAgo(0) },
    { snapshot_id: 'KPI-002', metric_name: 'MTTR', project_id: 'PROJ-001', value: 18.4, unit: 'hours', window_start: daysAgo(14), window_end: daysAgo(0) },
    { snapshot_id: 'KPI-003', metric_name: 'MPI', project_id: 'PROJ-002', value: 132.8, unit: 'km/intervention', window_start: daysAgo(14), window_end: daysAgo(0) },
    { snapshot_id: 'KPI-004', metric_name: 'FleetUtilization', project_id: 'PROJ-001', value: 68.2, unit: 'percent', window_start: daysAgo(7), window_end: daysAgo(0) },
    { snapshot_id: 'KPI-005', metric_name: 'IssueConvergence', project_id: 'PROJ-002', value: 0.85, unit: 'ratio', window_start: daysAgo(14), window_end: daysAgo(0) },
  ]);
  console.log(`[seed] Inserted ${kpiSnapshots.length} KPI snapshots`);

  // -------------------------------------------------------------------------
  // Issue State Transitions (sample audit trail)
  // -------------------------------------------------------------------------
  const transitions = await IssueStateTransition.insertMany([
    { transition_id: 'TRN-001', issue_id: 'ISS-001', from_status: 'New', to_status: 'Triage', triggered_by: 'system', reason: 'Auto-triaged based on severity' },
    { transition_id: 'TRN-002', issue_id: 'ISS-001', from_status: 'Triage', to_status: 'Assigned', triggered_by: 'lead@nvidopia.dev', reason: 'Triaged: assigned to alice@nvidopia.dev (perception)' },
    { transition_id: 'TRN-003', issue_id: 'ISS-001', from_status: 'Assigned', to_status: 'InProgress', triggered_by: 'alice@nvidopia.dev' },
    { transition_id: 'TRN-004', issue_id: 'ISS-001', from_status: 'InProgress', to_status: 'Fixed', triggered_by: 'alice@nvidopia.dev', reason: 'Fixed in commit abc1234' },
    { transition_id: 'TRN-005', issue_id: 'ISS-003', from_status: 'New', to_status: 'Triage', triggered_by: 'system' },
    { transition_id: 'TRN-006', issue_id: 'ISS-003', from_status: 'Triage', to_status: 'Assigned', triggered_by: 'lead@nvidopia.dev' },
    { transition_id: 'TRN-007', issue_id: 'ISS-003', from_status: 'Assigned', to_status: 'InProgress', triggered_by: 'alice@nvidopia.dev' },
    { transition_id: 'TRN-008', issue_id: 'ISS-003', from_status: 'InProgress', to_status: 'Fixed', triggered_by: 'alice@nvidopia.dev' },
    { transition_id: 'TRN-009', issue_id: 'ISS-003', from_status: 'Fixed', to_status: 'RegressionTracking', triggered_by: 'system' },
    { transition_id: 'TRN-010', issue_id: 'ISS-003', from_status: 'RegressionTracking', to_status: 'Closed', triggered_by: 'lead@nvidopia.dev', reason: 'Regression pass confirmed in RUN-004' },
  ]);
  console.log(`[seed] Inserted ${transitions.length} issue state transitions`);

  // -------------------------------------------------------------------------
  // Vehicle dynamics snapshots for sample issues
  // -------------------------------------------------------------------------
  await Issue.updateOne({ issue_id: 'ISS-001' }, {
    $set: {
      vehicle_dynamics: {
        speed_mps: 13.4, acceleration_mps2: -2.1, lateral_acceleration_mps2: 0.3,
        yaw_rate_dps: 1.2, heading_deg: 87.5, quaternion: { w: 0.998, x: 0.0, y: 0.0, z: 0.063 },
        steering_angle_deg: -3.2, throttle_pct: 0, brake_pressure_bar: 45.0, gear: 'D',
        wheel_speeds_mps: [13.2, 13.3, 13.5, 13.6],
      },
    },
  });
  await Issue.updateOne({ issue_id: 'ISS-003' }, {
    $set: {
      vehicle_dynamics: {
        speed_mps: 22.0, acceleration_mps2: -8.5, lateral_acceleration_mps2: 0.1,
        yaw_rate_dps: 0.0, heading_deg: 180.0, quaternion: { w: 0.707, x: 0.0, y: 0.0, z: 0.707 },
        steering_angle_deg: 0.0, throttle_pct: 0, brake_pressure_bar: 120.0, gear: 'D',
        wheel_speeds_mps: [22.1, 22.0, 21.8, 21.9],
      },
    },
  });
  console.log('[seed] Added vehicle dynamics snapshots to ISS-001, ISS-003');

  // -------------------------------------------------------------------------
  // Time-series data for ISS-001
  // -------------------------------------------------------------------------
  const tsData = await IssueTimeSeries.insertMany([
    {
      issue_id: 'ISS-001',
      channel: 'lidar_front',
      channel_type: 'sensor',
      time_range_ms: { start: -3000, end: 3000 },
      data_points: Array.from({ length: 61 }, (_, i) => ({
        t: -3000 + i * 100,
        values: { point_count: 12000 + Math.floor(Math.random() * 2000), detection_score: 0.85 + Math.random() * 0.15 },
      })),
    },
    {
      issue_id: 'ISS-001',
      channel: 'ego_dynamics',
      channel_type: 'vehicle_dynamics',
      time_range_ms: { start: -3000, end: 3000 },
      data_points: Array.from({ length: 61 }, (_, i) => ({
        t: -3000 + i * 100,
        values: { speed_mps: 13.4 + Math.sin(i * 0.1) * 0.5, accel_mps2: -2.1 + Math.cos(i * 0.2) * 0.3 },
      })),
    },
    {
      issue_id: 'ISS-001',
      channel: 'state_machine',
      channel_type: 'state_machine',
      time_range_ms: { start: -3000, end: 3000 },
      data_points: [
        { t: -3000, values: { state: 'CRUISING', confidence: 0.95 } },
        { t: -1500, values: { state: 'OBSTACLE_DETECTED', confidence: 0.72 } },
        { t: -500, values: { state: 'EMERGENCY_BRAKE', confidence: 0.99 } },
        { t: 500, values: { state: 'STOPPED', confidence: 1.0 } },
        { t: 2000, values: { state: 'TAKEOVER_REQUESTED', confidence: 1.0 } },
      ],
    },
  ]);
  console.log(`[seed] Inserted ${tsData.length} time-series channels for ISS-001`);

  // -------------------------------------------------------------------------
  // Custom KPI definitions (defaults)
  // -------------------------------------------------------------------------
  const kpiDefs = await KpiDefinition.insertMany([
    {
      kpi_id: 'KPI-DEF-001',
      name: 'Issue Count by Category',
      description: 'Total number of issues grouped by category',
      data_source: 'issue',
      formula: 'issue_count',
      variables: [{ name: 'issue_count', source_entity: 'issue', field: 'issue_id', aggregation: 'count' }],
      group_by: ['category'],
      visualization: { chart_type: 'bar', x_axis: { field: 'category', label: 'Category' }, y_axes: [{ variable: 'issue_count', label: 'Count' }] },
      display_order: 1,
      enabled: true,
      created_by: 'system',
    },
    {
      kpi_id: 'KPI-DEF-002',
      name: 'Avg Mileage per Run',
      description: 'Average autonomous mileage per completed run',
      data_source: 'run',
      filters: [{ field: 'status', operator: 'eq', value: 'Completed' }],
      formula: 'avg_mileage',
      variables: [{ name: 'avg_mileage', source_entity: 'run', field: 'total_auto_mileage_km', aggregation: 'avg' }],
      visualization: { chart_type: 'stat' },
      display_order: 2,
      enabled: true,
      created_by: 'system',
    },
    {
      kpi_id: 'KPI-DEF-003',
      name: 'Issue Severity Distribution',
      description: 'Issue count by severity level',
      data_source: 'issue',
      formula: 'count_by_severity',
      variables: [{ name: 'count_by_severity', source_entity: 'issue', field: 'issue_id', aggregation: 'count' }],
      group_by: ['severity'],
      visualization: { chart_type: 'pie', x_axis: { field: 'severity' }, y_axes: [{ variable: 'count_by_severity', label: 'Count' }] },
      display_order: 3,
      enabled: true,
      created_by: 'system',
    },
  ]);
  console.log(`[seed] Inserted ${kpiDefs.length} custom KPI definitions`);

  // -------------------------------------------------------------------------
  // Vehicle Trajectory Points (simulated GPS data)
  // -------------------------------------------------------------------------
  const MODES = ['Manual', 'ACC', 'LCC', 'HighwayPilot', 'UrbanPilot'] as const;
  const trajectoryPoints: any[] = [];

  const vehicleTrajectoryConfigs = [
    { vin: 'VIN-ORINX-001', run_id: 'RUN-008', baseLat: 31.2304, baseLng: 121.4737, count: 100 },
    { vin: 'VIN-ORIN-003', run_id: 'RUN-009', baseLat: 39.9042, baseLng: 116.4074, count: 100 },
    { vin: 'VIN-ORINX-002', run_id: 'RUN-002', baseLat: 31.2397, baseLng: 121.4998, count: 80 },
    { vin: 'VIN-ORIN-004', run_id: 'RUN-006', baseLat: 39.9142, baseLng: 116.3974, count: 60 },
    { vin: 'VIN-ORINX-005', run_id: 'RUN-004', baseLat: 31.2244, baseLng: 121.4692, count: 80 },
  ];

  for (const cfg of vehicleTrajectoryConfigs) {
    for (let i = 0; i < cfg.count; i++) {
      const modeIdx = Math.floor(i / 20) % MODES.length;
      trajectoryPoints.push({
        vin: cfg.vin,
        run_id: cfg.run_id,
        timestamp: new Date(Date.now() - (cfg.count - i) * 30000),
        location: {
          lat: cfg.baseLat + (i * 0.0005) * Math.cos(i * 0.1),
          lng: cfg.baseLng + (i * 0.0005) * Math.sin(i * 0.1),
        },
        speed_mps: 5 + Math.random() * 25,
        driving_mode: MODES[modeIdx],
        heading_deg: (i * 3.6) % 360,
      });
    }
  }

  await VehicleTrajectory.insertMany(trajectoryPoints);
  console.log(`[seed] Inserted ${trajectoryPoints.length} trajectory points`);

  // -------------------------------------------------------------------------
  // Vehicle Status Segments
  // -------------------------------------------------------------------------
  const statusSegments: any[] = [];
  const segVehicles = [
    { vin: 'VIN-ORINX-001', run_id: 'RUN-008' },
    { vin: 'VIN-ORIN-003', run_id: 'RUN-009' },
    { vin: 'VIN-ORINX-002', run_id: 'RUN-002' },
  ];

  for (const sv of segVehicles) {
    let timeOffset = 0;
    for (const mode of MODES) {
      const duration = 600_000 + Math.floor(Math.random() * 1_800_000);
      const mileage = (duration / 1000) * (5 + Math.random() * 20) / 1000;
      statusSegments.push({
        vin: sv.vin,
        run_id: sv.run_id,
        driving_mode: mode,
        start_time: new Date(Date.now() - 7200000 + timeOffset),
        end_time: new Date(Date.now() - 7200000 + timeOffset + duration),
        duration_ms: duration,
        mileage_km: Math.round(mileage * 100) / 100,
      });
      timeOffset += duration;
    }
  }

  await VehicleStatusSegment.insertMany(statusSegments);
  console.log(`[seed] Inserted ${statusSegments.length} status segments`);

  // -------------------------------------------------------------------------
  // PTC — Projects, Tasks, Builds, Cars, Tags, Drives, Bindings
  // -------------------------------------------------------------------------

  const ptcProjects = await PtcProject.insertMany([
    { project_id: 'PTC-PROJ-001', name: 'V2.0 Urban Pilot PTC' },
    { project_id: 'PTC-PROJ-002', name: 'V1.5 Highway Assist PTC' },
    { project_id: 'PTC-PROJ-003', name: 'V3.0 City Cruise PTC' },
  ]);
  console.log(`[seed] Inserted ${ptcProjects.length} PTC projects`);

  const ptcTasks = await PtcTask.insertMany([
    { task_id: 'PTC-TASK-001', project_id: 'PTC-PROJ-001', name: 'Urban Regression Week 12', start_date: daysAgo(14), end_date: daysAgo(7) },
    { task_id: 'PTC-TASK-002', project_id: 'PTC-PROJ-001', name: 'Urban Corner Case Validation', start_date: daysAgo(7), end_date: daysAgo(0) },
    { task_id: 'PTC-TASK-003', project_id: 'PTC-PROJ-002', name: 'Highway Night Test Campaign', start_date: daysAgo(21), end_date: daysAgo(14) },
    { task_id: 'PTC-TASK-004', project_id: 'PTC-PROJ-002', name: 'Highway Rain Condition Soak', start_date: daysAgo(10), end_date: daysAgo(3) },
    { task_id: 'PTC-TASK-005', project_id: 'PTC-PROJ-003', name: 'City Cruise Alpha Test', start_date: daysAgo(5) },
  ]);
  console.log(`[seed] Inserted ${ptcTasks.length} PTC tasks`);

  const ptcBuilds = await PtcBuild.insertMany([
    { build_id: 'PTC-BLD-001', version_tag: 'v2.0.0-rc3-ptc', build_time: daysAgo(20) },
    { build_id: 'PTC-BLD-002', version_tag: 'v2.0.0-rc4-ptc', build_time: daysAgo(12) },
    { build_id: 'PTC-BLD-003', version_tag: 'v1.5.2-ptc', build_time: daysAgo(25) },
    { build_id: 'PTC-BLD-004', version_tag: 'v3.0.0-alpha1', build_time: daysAgo(6) },
  ]);
  console.log(`[seed] Inserted ${ptcBuilds.length} PTC builds`);

  const ptcCars = await PtcCar.insertMany([
    { car_id: 'PTC-CAR-001', name: 'EP32-SH-001', vin: 'VIN-ORINX-001' },
    { car_id: 'PTC-CAR-002', name: 'EP32-SH-002', vin: 'VIN-ORINX-002' },
    { car_id: 'PTC-CAR-003', name: 'ES33-BJ-001', vin: 'VIN-ORIN-003' },
    { car_id: 'PTC-CAR-004', name: 'ES33-BJ-002', vin: 'VIN-ORIN-004' },
    { car_id: 'PTC-CAR-005', name: 'EP32-SH-003', vin: 'VIN-ORINX-005' },
    { car_id: 'PTC-CAR-006', name: 'EP32-GZ-001' },
  ]);
  console.log(`[seed] Inserted ${ptcCars.length} PTC cars`);

  const ptcTags = await PtcTag.insertMany([
    { tag_id: 'PTC-TAG-001', name: 'Urban' },
    { tag_id: 'PTC-TAG-002', name: 'Highway' },
    { tag_id: 'PTC-TAG-003', name: 'Night' },
    { tag_id: 'PTC-TAG-004', name: 'Rain' },
    { tag_id: 'PTC-TAG-005', name: 'CornerCase' },
  ]);
  console.log(`[seed] Inserted ${ptcTags.length} PTC tags`);

  const ptcDrivesData: any[] = [];
  const ROUTES = ['浦东新区-陆家嘴环路', '张江高科-金科路', 'G2京沪高速-昆山段', 'G15沈海高速-嘉兴段', '海淀区-中关村北大街', '天河区-天河路'];
  let driveIdx = 1;
  const carBuildTagCombos = [
    { car: 'PTC-CAR-001', build: 'PTC-BLD-001', tag: 'PTC-TAG-001' },
    { car: 'PTC-CAR-001', build: 'PTC-BLD-002', tag: 'PTC-TAG-001' },
    { car: 'PTC-CAR-002', build: 'PTC-BLD-001', tag: 'PTC-TAG-005' },
    { car: 'PTC-CAR-002', build: 'PTC-BLD-002', tag: 'PTC-TAG-001' },
    { car: 'PTC-CAR-003', build: 'PTC-BLD-003', tag: 'PTC-TAG-002' },
    { car: 'PTC-CAR-003', build: 'PTC-BLD-003', tag: 'PTC-TAG-003' },
    { car: 'PTC-CAR-004', build: 'PTC-BLD-003', tag: 'PTC-TAG-004' },
    { car: 'PTC-CAR-005', build: 'PTC-BLD-001', tag: 'PTC-TAG-001' },
    { car: 'PTC-CAR-005', build: 'PTC-BLD-002', tag: 'PTC-TAG-005' },
    { car: 'PTC-CAR-006', build: 'PTC-BLD-004', tag: 'PTC-TAG-001' },
  ];

  for (const combo of carBuildTagCombos) {
    const drivesPerCombo = 3 + Math.floor(Math.random() * 4);
    for (let d = 0; d < drivesPerCombo; d++) {
      const dayOffset = Math.floor(Math.random() * 20);
      const startHour = 6 + Math.floor(Math.random() * 14);
      const durationHours = 1 + Math.random() * 4;
      const start = new Date(daysAgo(dayOffset));
      start.setHours(startHour, 0, 0, 0);
      const end = new Date(start.getTime() + durationHours * 3600_000);

      ptcDrivesData.push({
        drive_id: `PTC-DRV-${String(driveIdx).padStart(3, '0')}`,
        car_id: combo.car,
        build_id: combo.build,
        tag_id: combo.tag,
        date: new Date(start.toISOString().slice(0, 10)),
        start_time: start,
        end_time: end,
        mileage_km: Math.round((20 + Math.random() * 180) * 10) / 10,
        xl_events: Math.floor(Math.random() * 3),
        l_events: Math.floor(Math.random() * 8),
        hotline_count: Math.floor(Math.random() * 2),
        route: ROUTES[Math.floor(Math.random() * ROUTES.length)],
      });
      driveIdx++;
    }
  }

  await PtcDrive.insertMany(ptcDrivesData);
  console.log(`[seed] Inserted ${ptcDrivesData.length} PTC drives`);

  const ptcBindings = await PtcBinding.insertMany([
    {
      binding_id: 'PTC-BIND-001',
      task_id: 'PTC-TASK-001',
      status: 'Published',
      filter_criteria: { builds: ['PTC-BLD-001', 'PTC-BLD-002'], cars: ['PTC-CAR-001', 'PTC-CAR-002'], tags: ['PTC-TAG-001'] },
      cars: [
        {
          car_id: 'PTC-CAR-001',
          drives: ptcDrivesData.filter(d => d.car_id === 'PTC-CAR-001').map(d => ({ drive_id: d.drive_id, selected: true })),
        },
        {
          car_id: 'PTC-CAR-002',
          drives: ptcDrivesData.filter(d => d.car_id === 'PTC-CAR-002').map((d, i) => ({
            drive_id: d.drive_id,
            selected: i !== 0,
            ...(i === 0 ? { deselect_reason_preset: '数据异常', deselect_reason_text: 'Lidar数据缺失前10分钟' } : {}),
          })),
        },
      ],
    },
    {
      binding_id: 'PTC-BIND-002',
      task_id: 'PTC-TASK-002',
      status: 'Draft',
      filter_criteria: { builds: ['PTC-BLD-002'], cars: ['PTC-CAR-001', 'PTC-CAR-005'], tags: ['PTC-TAG-005'] },
      cars: [
        {
          car_id: 'PTC-CAR-005',
          drives: ptcDrivesData.filter(d => d.car_id === 'PTC-CAR-005').map(d => ({ drive_id: d.drive_id, selected: true })),
        },
      ],
    },
    {
      binding_id: 'PTC-BIND-003',
      task_id: 'PTC-TASK-003',
      status: 'Published',
      filter_criteria: { builds: ['PTC-BLD-003'], cars: ['PTC-CAR-003', 'PTC-CAR-004'], tags: ['PTC-TAG-002', 'PTC-TAG-003'] },
      cars: [
        {
          car_id: 'PTC-CAR-003',
          drives: ptcDrivesData.filter(d => d.car_id === 'PTC-CAR-003').map(d => ({ drive_id: d.drive_id, selected: true })),
        },
        {
          car_id: 'PTC-CAR-004',
          drives: ptcDrivesData.filter(d => d.car_id === 'PTC-CAR-004').map((d, i) => ({
            drive_id: d.drive_id,
            selected: i !== 1,
            ...(i === 1 ? { deselect_reason_preset: '设备故障', deselect_reason_text: '雷达传感器在暴雨中失效' } : {}),
          })),
        },
      ],
    },
    {
      binding_id: 'PTC-BIND-004',
      task_id: 'PTC-TASK-004',
      status: 'Published',
      filter_criteria: { builds: ['PTC-BLD-003'], cars: ['PTC-CAR-003'], tags: ['PTC-TAG-004'] },
      cars: [
        {
          car_id: 'PTC-CAR-003',
          drives: ptcDrivesData.filter(d => d.car_id === 'PTC-CAR-003' && d.tag_id === 'PTC-TAG-003').slice(0, 2).map(d => ({ drive_id: d.drive_id, selected: true })),
        },
      ],
    },
  ]);
  console.log(`[seed] Inserted ${ptcBindings.length} PTC bindings`);

  console.log('\n[seed] Seeding complete!');
  console.log('  - 2 Projects');
  console.log('  - 6 Tasks');
  console.log('  - 5 Vehicles (with plate_type, model_code, component_versions)');
  console.log('  - 10 Runs');
  console.log('  - 20 Issues (2 with vehicle dynamics snapshots)');
  console.log('  - 3 Requirements');
  console.log('  - 5 Commits');
  console.log('  - 2 Builds');
  console.log('  - 5 KPI Snapshots');
  console.log('  - 10 Issue State Transitions');
  console.log('  - 3 Time-Series Channels');
  console.log('  - 3 Custom KPI Definitions');
  console.log(`  - ${trajectoryPoints.length} Trajectory Points`);
  console.log(`  - ${statusSegments.length} Status Segments`);
  console.log(`  - ${ptcProjects.length} PTC Projects`);
  console.log(`  - ${ptcTasks.length} PTC Tasks`);
  console.log(`  - ${ptcBuilds.length} PTC Builds`);
  console.log(`  - ${ptcCars.length} PTC Cars`);
  console.log(`  - ${ptcTags.length} PTC Tags`);
  console.log(`  - ${ptcDrivesData.length} PTC Drives`);
  console.log(`  - ${ptcBindings.length} PTC Bindings`);

  await mongoose.disconnect();
  console.log('[seed] Disconnected from MongoDB');
}

seed().catch((err) => {
  console.error('[seed] Fatal error:', err);
  process.exit(1);
});
