const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/* ── Types ────────────────────────────────────────────── */

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  vehicle_platform?: string;
  soc_architecture?: string;
  sensor_suite_version?: string;
  software_baseline_version?: string;
  target_mileage_km?: number;
  start_date?: string;
  extra?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  stage: string;
  taskType?: string;
  priority: string;
  assignee?: string;
  executionRegion?: string;
  targetVehicleCount?: number;
  extra?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Run {
  id: string;
  taskId: string;
  status: string;
  vehicleIds: string[];
  startedAt?: string;
  completedAt?: string;
  totalAutoMileageKm?: number;
  result?: string;
  extra?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  vin: string;
  name: string;
  status: string;
  platform?: string;
  plateType?: 'permanent' | 'temporary';
  modelCode?: string;
  socArchitecture?: string;
  sensorSuiteVersion?: string;
  componentVersions?: Record<string, string>;
  currentSpeed?: number;
  drivingMode?: string;
  currentLocation?: { lat: number; lng: number };
  fuelOrBatteryLevel?: number;
  lastHeartbeat?: string;
  updatedAt?: string;
}

export interface TrajectoryPoint {
  vin: string;
  run_id?: string;
  timestamp: string;
  location: { lat: number; lng: number };
  speed_mps: number;
  driving_mode: string;
  heading_deg?: number;
}

export interface StatusDistributionItem {
  driving_mode: string;
  total_duration_ms: number;
  total_mileage_km: number;
  segment_count: number;
}

export interface FleetDistribution {
  plate_type: Array<{ name: string; count: number }>;
  model_code: Array<{ name: string; count: number }>;
  soc_architecture: Array<{ name: string; count: number }>;
  driving_mode: Array<{ name: string; count: number }>;
  current_status: Array<{ name: string; count: number }>;
}

export interface IssueLocation {
  issue_id: string;
  category?: string;
  severity: string;
  description: string;
  vehicle_vin?: string;
  location?: { lat: number; lng: number };
  triggered_at?: string;
  run_id?: string;
  task_id?: string;
}

export interface VehicleDynamicsSnapshot {
  speed_mps?: number;
  acceleration_mps2?: number;
  lateral_acceleration_mps2?: number;
  yaw_rate_dps?: number;
  heading_deg?: number;
  quaternion?: { w: number; x: number; y: number; z: number };
  steering_angle_deg?: number;
  throttle_pct?: number;
  brake_pressure_bar?: number;
  gear?: string;
  wheel_speeds_mps?: number[];
  extra?: Record<string, unknown>;
}

export interface TimeSeriesDataPoint {
  t: number;
  values: Record<string, number | string | boolean>;
}

export interface IssueTimeSeriesChannel {
  issue_id: string;
  channel: string;
  channel_type: string;
  data_points: TimeSeriesDataPoint[];
  time_range_ms: { start: number; end: number };
  metadata?: Record<string, unknown>;
}

export interface Issue {
  id: string;
  title: string;
  description?: string;
  status: string;
  severity: string;
  category?: string;
  runId?: string;
  taskId?: string;
  assignee?: string;
  module?: string;
  takeoverType?: string;
  gpsLat?: number;
  gpsLng?: number;
  dataSnapshotUri?: string;
  triggerTimestamp?: string;
  faultCodes?: string[];
  environmentTags?: string[];
  triageMode?: string;
  triageHint?: string;
  fixCommitId?: string;
  rejectionReason?: string;
  vehicleDynamics?: VehicleDynamicsSnapshot;
  extra?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IssueTransition {
  id: string;
  fromStatus: string;
  toStatus: string;
  triggeredBy: string;
  transitionedAt?: string;
  reason?: string;
}

export interface TraceResult {
  trace_type?: string;
  nodes: Array<{ id: string; type: string; label: string }>;
  edges: Array<{ source: string; target: string }>;
  links?: Array<{ relationship?: string }>;
  origin_id?: string;
  [key: string]: unknown;
}

export interface CoverageResult {
  total: number;
  covered: number;
  percentage: number;
  details: Array<{ id: string; name: string; covered: boolean }>;
}

export interface KpiValue {
  value: number;
  unit: string;
  trend?: number;
  history?: Array<{ date: string; value: number }>;
  points?: Array<{
    timestamp?: string;
    value?: number;
    dimensions?: Record<string, unknown>;
  }>;
  [key: string]: unknown;
}

/* ── Fetch Helper ─────────────────────────────────────── */

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type AnyRecord = Record<string, unknown>;

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function optStr(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function optNum(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function collectExtra(raw: AnyRecord, knownKeys: Set<string>): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!knownKeys.has(k) && !k.startsWith('_')) extra[k] = v;
  }
  if (raw.extra && typeof raw.extra === 'object') Object.assign(extra, raw.extra as Record<string, unknown>);
  return extra;
}

const PROJECT_KNOWN = new Set(['id','project_id','name','description','status','vehicle_platform','soc_architecture','sensor_suite_version','software_baseline_version','target_mileage_km','start_date','end_date','extra','createdAt','created_at','updatedAt','updated_at','__v']);

function normalizeProject(raw: AnyRecord): Project {
  return {
    id: str(raw.id ?? raw.project_id),
    name: str(raw.name, 'Unnamed Project'),
    description: optStr(raw.description),
    status: str(raw.status, 'Planning'),
    vehicle_platform: optStr(raw.vehicle_platform),
    soc_architecture: optStr(raw.soc_architecture),
    sensor_suite_version: optStr(raw.sensor_suite_version),
    software_baseline_version: optStr(raw.software_baseline_version),
    target_mileage_km: optNum(raw.target_mileage_km),
    start_date: optStr(raw.start_date),
    extra: collectExtra(raw, PROJECT_KNOWN),
    createdAt: str(raw.createdAt ?? raw.created_at, new Date().toISOString()),
    updatedAt: str(raw.updatedAt ?? raw.updated_at, new Date().toISOString()),
  };
}

const TASK_KNOWN = new Set(['id','task_id','project_id','projectId','name','title','description','stage','status','task_type','taskType','priority','assignee','assigned_to','execution_region','executionRegion','target_vehicle_count','targetVehicleCount','simulation_ref','simulation_status','extra','createdAt','created_at','updatedAt','updated_at','__v']);

function normalizeTask(raw: AnyRecord): Task {
  return {
    id: str(raw.id ?? raw.task_id),
    projectId: str(raw.projectId ?? raw.project_id),
    title: str(raw.title ?? raw.name ?? raw.task_id, 'Untitled Task'),
    description: optStr(raw.description),
    stage: str(raw.stage ?? raw.status, 'Pending'),
    taskType: optStr(raw.task_type ?? raw.taskType),
    priority: str(raw.priority, 'Medium'),
    assignee: optStr(raw.assignee ?? raw.assigned_to),
    executionRegion: optStr(raw.execution_region ?? raw.executionRegion),
    targetVehicleCount: optNum(raw.target_vehicle_count ?? raw.targetVehicleCount),
    extra: collectExtra(raw, TASK_KNOWN),
    createdAt: str(raw.createdAt ?? raw.created_at, new Date().toISOString()),
    updatedAt: str(raw.updatedAt ?? raw.updated_at, new Date().toISOString()),
  };
}

const RUN_KNOWN = new Set(['id','run_id','task_id','taskId','vehicle_vin','vehicleIds','driver_id','start_time','startedAt','end_time','completedAt','total_auto_mileage_km','software_version_hash','hardware_heartbeat_version','status','result','simulation_ref','simulation_status','extra','createdAt','created_at','updatedAt','updated_at','__v']);

function normalizeRun(raw: AnyRecord): Run {
  const vehicleVin = optStr(raw.vehicle_vin);
  return {
    id: str(raw.id ?? raw.run_id),
    taskId: str(raw.taskId ?? raw.task_id),
    status: str(raw.status, 'Scheduled'),
    vehicleIds: Array.isArray(raw.vehicleIds)
      ? (raw.vehicleIds as string[])
      : vehicleVin
        ? [vehicleVin]
        : [],
    startedAt: optStr(raw.startedAt ?? raw.start_time),
    completedAt: optStr(raw.completedAt ?? raw.end_time),
    totalAutoMileageKm: optNum(raw.total_auto_mileage_km),
    result: optStr(raw.result),
    extra: collectExtra(raw, RUN_KNOWN),
    createdAt: str(raw.createdAt ?? raw.created_at, new Date().toISOString()),
    updatedAt: str(raw.updatedAt ?? raw.updated_at, new Date().toISOString()),
  };
}

const ISSUE_KNOWN = new Set(['id','issue_id','run_id','runId','task_id','taskId','title','description','status','severity','category','assignee','assigned_to','module','assigned_module','takeover_type','takeoverType','gps_coordinates','gps_lat','gps_lng','data_snapshot_uri','data_snapshot_url','trigger_timestamp','fault_codes','environment_tags','triage_mode','triage_hint','triage_source','fix_commit_id','fix_version_hash','rejection_reason','vehicle_dynamics','extra','createdAt','created_at','updatedAt','updated_at','__v']);

function normalizeIssue(raw: AnyRecord): Issue {
  const issueId = str(raw.id ?? raw.issue_id);
  const category = optStr(raw.category);
  const coords = raw.gps_coordinates as AnyRecord | undefined;
  return {
    id: issueId,
    title: str(raw.title, category ? `${category} (${issueId})` : `Issue ${issueId}`),
    description: optStr(raw.description),
    status: str(raw.status, 'New'),
    severity: str(raw.severity, 'Medium'),
    category,
    runId: optStr(raw.runId ?? raw.run_id),
    taskId: optStr(raw.taskId ?? raw.task_id),
    assignee: optStr(raw.assignee ?? raw.assigned_to),
    module: optStr(raw.module ?? raw.assigned_module),
    takeoverType: optStr(raw.takeover_type ?? raw.takeoverType),
    gpsLat: optNum(raw.gps_lat) ?? optNum(coords?.lat),
    gpsLng: optNum(raw.gps_lng) ?? optNum(coords?.lng),
    dataSnapshotUri: optStr(raw.data_snapshot_uri ?? raw.data_snapshot_url),
    triggerTimestamp: optStr(raw.trigger_timestamp),
    faultCodes: Array.isArray(raw.fault_codes) ? raw.fault_codes as string[] : undefined,
    environmentTags: Array.isArray(raw.environment_tags) ? raw.environment_tags as string[] : undefined,
    triageMode: optStr(raw.triage_mode),
    triageHint: optStr(raw.triage_hint),
    fixCommitId: optStr(raw.fix_commit_id),
    rejectionReason: optStr(raw.rejection_reason),
    vehicleDynamics: raw.vehicle_dynamics as VehicleDynamicsSnapshot | undefined,
    extra: collectExtra(raw, ISSUE_KNOWN),
    createdAt: str(raw.createdAt ?? raw.created_at, new Date().toISOString()),
    updatedAt: str(raw.updatedAt ?? raw.updated_at, new Date().toISOString()),
  };
}

function normalizeTransition(raw: AnyRecord): IssueTransition {
  return {
    id: str(raw.id ?? raw.transition_id),
    fromStatus: str(raw.from_status ?? raw.fromStatus ?? raw.from),
    toStatus: str(raw.to_status ?? raw.toStatus ?? raw.to),
    triggeredBy: str(raw.triggered_by ?? raw.triggeredBy),
    transitionedAt: optStr(raw.transitioned_at ?? raw.created_at),
    reason: optStr(raw.reason),
  };
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, body || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/* ── Query String ─────────────────────────────────────── */

function toQueryString(params?: Record<string, string | undefined>): string {
  if (!params) return '';
  const aliases: Record<string, string> = {
    projectId: 'project_id', taskId: 'task_id', runId: 'run_id',
    vehicleVin: 'vehicle_vin', startDate: 'start_date', endDate: 'end_date',
    timeRange: 'time_range',
  };
  const normalized = Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [aliases[k] ?? k, v]),
  ) as Record<string, string>;
  const query = new URLSearchParams(normalized).toString();
  return query ? `?${query}` : '';
}

/* ── Projects ─────────────────────────────────────────── */

export async function getProjects(params?: Record<string, string | undefined>) {
  const qs = toQueryString(params);
  const raw = await fetchJson<AnyRecord[] | { data: AnyRecord[]; items: AnyRecord[] }>(`/projects${qs}`);
  const items = Array.isArray(raw) ? raw : (raw.data ?? raw.items ?? []);
  return items.map((r) => normalizeProject(r));
}

export function getProject(id: string) {
  return fetchJson<AnyRecord>(`/projects/${id}`).then(normalizeProject);
}

export function createProject(data: Partial<Project>) {
  return fetchJson<Project>('/projects', { method: 'POST', body: JSON.stringify(data) });
}

export function updateProject(id: string, data: Partial<Project>) {
  return fetchJson<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

/* ── Tasks ────────────────────────────────────────────── */

export async function getTasks(params?: Record<string, string | undefined>) {
  const qs = toQueryString(params);
  const raw = await fetchJson<AnyRecord[] | { data: AnyRecord[] }>(`/tasks${qs}`);
  const items = Array.isArray(raw) ? raw : (raw.data ?? []);
  return items.map((r) => normalizeTask(r));
}

export function getTask(id: string) {
  return fetchJson<AnyRecord>(`/tasks/${id}`).then(normalizeTask);
}

export function createTask(data: Partial<Task>) {
  return fetchJson<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) });
}

export function updateTask(id: string, data: Partial<Task>) {
  return fetchJson<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function advanceTaskStage(id: string) {
  return fetchJson<Task>(`/tasks/${id}/advance-stage`, { method: 'PUT' });
}

/* ── Runs ─────────────────────────────────────────────── */

export async function getRuns(params?: Record<string, string | undefined>) {
  const qs = toQueryString(params);
  const raw = await fetchJson<AnyRecord[] | { data: AnyRecord[] }>(`/runs${qs}`);
  const items = Array.isArray(raw) ? raw : (raw.data ?? []);
  return items.map((r) => normalizeRun(r));
}

export function getRun(id: string) {
  return fetchJson<AnyRecord>(`/runs/${id}`).then(normalizeRun);
}

export function createRun(data: Partial<Run>) {
  return fetchJson<Run>('/runs', { method: 'POST', body: JSON.stringify(data) });
}

export function updateRun(id: string, data: Partial<Run>) {
  return fetchJson<Run>(`/runs/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function assignVehicles(runId: string, vehicleIds: string[]) {
  return fetchJson<Run>(`/runs/${runId}/vehicles`, { method: 'POST', body: JSON.stringify({ vehicleIds }) });
}

/* ── Vehicles ─────────────────────────────────────────── */

function normalizeVehicle(raw: AnyRecord): Vehicle {
  return {
    id: str(raw.vin ?? raw._id ?? raw.id),
    vin: str(raw.vin),
    name: str(raw.vin ?? raw.name, 'Unknown'),
    status: str(raw.current_status ?? raw.status, 'Offline'),
    platform: optStr(raw.vehicle_platform ?? raw.platform),
    plateType: optStr(raw.plate_type) as Vehicle['plateType'],
    modelCode: optStr(raw.model_code),
    socArchitecture: optStr(raw.soc_architecture),
    sensorSuiteVersion: optStr(raw.sensor_suite_version),
    componentVersions: raw.component_versions as Record<string, string> | undefined,
    currentSpeed: optNum(raw.current_speed_mps),
    drivingMode: optStr(raw.driving_mode),
    currentLocation: raw.current_location as { lat: number; lng: number } | undefined,
    fuelOrBatteryLevel: optNum(raw.fuel_or_battery_level),
    lastHeartbeat: optStr(raw.last_heartbeat),
    updatedAt: optStr(raw.updated_at ?? raw.updatedAt),
  };
}

export async function getVehicles(params?: Record<string, string | undefined>) {
  const qs = toQueryString(params);
  const raw = await fetchJson<AnyRecord[] | { data: AnyRecord[] }>(`/vehicles${qs}`);
  const items = Array.isArray(raw) ? raw : (raw.data ?? []);
  return items.map((r) => normalizeVehicle(r));
}

export function getVehicle(vin: string) {
  return fetchJson<AnyRecord>(`/vehicles/${vin}`).then(normalizeVehicle);
}

export function updateVehicle(vin: string, data: Partial<Vehicle>) {
  return fetchJson<AnyRecord>(`/vehicles/${vin}`, { method: 'PUT', body: JSON.stringify(data) }).then(normalizeVehicle);
}

export function getVehicleStatusDistribution(vin: string, params?: Record<string, string | undefined>) {
  return fetchJson<StatusDistributionItem[]>(`/vehicles/${vin}/status-distribution${toQueryString(params)}`);
}

export function getVehicleTrajectory(vin: string, params?: Record<string, string | undefined>) {
  return fetchJson<{ data: TrajectoryPoint[]; total: number }>(`/vehicles/${vin}/trajectory${toQueryString(params)}`);
}

/* ── Fleet Stats ─────────────────────────────────────── */

export function getFleetDistribution() {
  return fetchJson<FleetDistribution>('/fleet/distribution');
}

export function getFleetStatusDistribution() {
  return fetchJson<StatusDistributionItem[]>('/fleet/status-distribution');
}

export function getFleetActiveTasks() {
  return fetchJson<Record<string, Array<{ vin: string; run_id: string; task_id: string }>>>('/fleet/active-tasks');
}

/* ── Trajectory ──────────────────────────────────────── */

export function queryTrajectory(params?: Record<string, string | undefined>) {
  return fetchJson<{ data: TrajectoryPoint[]; total: number }>(`/trajectory/query${toQueryString(params)}`);
}

export function queryIssueLocations(params?: Record<string, string | undefined>) {
  return fetchJson<{ data: IssueLocation[]; total: number }>(`/trajectory/issues${toQueryString(params)}`);
}

/* ── Issues ───────────────────────────────────────────── */

export async function getIssues(params?: Record<string, string | undefined>) {
  const qs = toQueryString(params);
  const raw = await fetchJson<AnyRecord[] | { data: AnyRecord[] }>(`/issues${qs}`);
  const items = Array.isArray(raw) ? raw : (raw.data ?? []);
  return items.map((r) => normalizeIssue(r));
}

export function getIssue(id: string) {
  return fetchJson<AnyRecord>(`/issues/${id}`).then(normalizeIssue);
}

export function createIssue(data: Partial<Issue>) {
  return fetchJson<Issue>('/issues', { method: 'POST', body: JSON.stringify(data) });
}

export function updateIssue(id: string, data: Partial<Issue>) {
  return fetchJson<Issue>(`/issues/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function transitionIssue(
  id: string,
  payload: { to_status: string; triggered_by: string; reason?: string },
) {
  return fetchJson<Issue>(`/issues/${id}/transition`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function triageIssue(
  id: string,
  payload: { assignee: string; module: string; triggered_by?: string },
) {
  return fetchJson<Issue>(`/issues/${id}/triage`, {
    method: 'POST',
    body: JSON.stringify({
      assigned_to: payload.assignee,
      assigned_module: payload.module,
      triggered_by: payload.triggered_by ?? 'ui-user',
    }),
  });
}

export async function getIssueTransitions(id: string) {
  const raw = await fetchJson<AnyRecord[] | { items: AnyRecord[] }>(`/issues/${id}/transitions`);
  const items = (Array.isArray(raw) ? raw : raw.items ?? []).map(normalizeTransition);
  return { items };
}

/* ── Traceability ─────────────────────────────────────── */

export function getForwardTrace(requirementId: string) {
  return fetchJson<TraceResult>(`/traceability/forward/${requirementId}`);
}

export function getBackwardTrace(issueId: string) {
  return fetchJson<TraceResult>(`/traceability/backward/${issueId}`);
}

export function getImpactTrace(changeId: string) {
  return fetchJson<TraceResult>(`/traceability/impact/${changeId}`);
}

export const traceForward = getForwardTrace;
export const traceBackward = getBackwardTrace;

export function getCoverage(_params?: Record<string, unknown>) {
  return fetchJson<AnyRecord>('/traceability/coverage').then((raw): CoverageResult => ({
    total: Number(raw.total ?? raw.total_requirements ?? 0),
    covered: Number(raw.covered ?? raw.covered_requirements ?? 0),
    percentage: Number(raw.percentage ?? raw.coverage_percentage ?? 0),
    details: Array.isArray(raw.details) ? raw.details as CoverageResult['details'] : [],
  }));
}

/* ── KPI ──────────────────────────────────────────────── */

export function getMpi(params?: Record<string, string | undefined>) {
  return fetchJson<KpiValue>(`/kpi/mpi${toQueryString(params)}`);
}

export function getMttr(params?: Record<string, string | undefined>) {
  return fetchJson<KpiValue>(`/kpi/mttr${toQueryString(params)}`);
}

export function getRegressionPassRate(params?: Record<string, string | undefined>) {
  return fetchJson<KpiValue>(`/kpi/regression-pass-rate${toQueryString(params)}`);
}

export function getFleetUtilization(params?: Record<string, string | undefined>) {
  return fetchJson<KpiValue>(`/kpi/fleet-utilization${toQueryString(params)}`);
}

export function getIssueConvergence(params?: Record<string, string | undefined>) {
  return fetchJson<AnyRecord>(`/kpi/issue-convergence${toQueryString(params)}`).then((raw) => {
    const series = Array.isArray(raw.series) ? (raw.series as AnyRecord[]) : [];
    return {
      value: Number(raw.value ?? 0),
      unit: str(raw.unit, ''),
      points: series.map((row) => ({
        timestamp: str(row.date),
        value: Number(row.new_issues ?? 0),
        dimensions: {
          open_count: Number(row.new_issues ?? 0),
          closed_count: Number(row.closed_issues ?? 0),
        },
      })),
      ...raw,
    } as KpiValue;
  });
}

/* ── Issue Snapshot & Time-Series ─────────────────────── */

export function getIssueSnapshot(issueId: string) {
  return fetchJson<VehicleDynamicsSnapshot>(`/issues/${issueId}/snapshot`);
}

export function uploadIssueSnapshot(issueId: string, data: VehicleDynamicsSnapshot) {
  return fetchJson<VehicleDynamicsSnapshot>(`/issues/${issueId}/snapshot`, {
    method: 'POST', body: JSON.stringify(data),
  });
}

export function getIssueTimeSeries(issueId: string) {
  return fetchJson<IssueTimeSeriesChannel[]>(`/issues/${issueId}/timeseries`);
}

export function getIssueTimeSeriesChannel(issueId: string, channel: string) {
  return fetchJson<IssueTimeSeriesChannel>(`/issues/${issueId}/timeseries/${channel}`);
}

export function uploadIssueTimeSeries(issueId: string, data: Partial<IssueTimeSeriesChannel> | Partial<IssueTimeSeriesChannel>[]) {
  return fetchJson<unknown>(`/issues/${issueId}/timeseries`, {
    method: 'POST', body: JSON.stringify(data),
  });
}

/* ── Schema Registry ─────────────────────────────────── */

export interface SchemaFieldMeta {
  name: string;
  type: string;
  required: boolean;
  enum?: string[];
  children?: SchemaFieldMeta[];
}

export interface SchemaEntityFields {
  entity: string;
  fields: SchemaFieldMeta[];
}

export function getSchemaFields(entity?: string) {
  const path = entity ? `/schema/fields/${entity}` : '/schema/fields';
  return fetchJson<SchemaEntityFields | Record<string, SchemaEntityFields>>(path);
}

/* ── Custom KPI Definitions ──────────────────────────── */

export interface KpiDefinition {
  kpi_id: string;
  name: string;
  description?: string;
  data_source: string;
  filters?: Array<{ field: string; operator: string; value: unknown }>;
  group_by?: string[];
  formula: string;
  formula_format?: 'mathjs';
  variables: Array<{ name: string; source_entity: string; field: string; aggregation: string }>;
  visualization: {
    chart_type: string;
    x_axis?: { field: string; label?: string; type?: 'category' | 'time' };
    y_axes?: Array<{ variable: string; label?: string; color?: string; axis_id?: string }>;
    dimensions?: string[];
    thresholds?: Array<{ value: number; label?: string; color?: string }>;
    color_ranges?: Array<{ min: number; max: number; color: string }>;
    sort?: { field: string; order: 'asc' | 'desc' };
    limit?: number;
    format?: { precision?: number; prefix?: string; suffix?: string; notation?: string };
    size?: 'small' | 'medium' | 'large';
  };
  vchart_spec?: Record<string, unknown>;
  renderer?: 'recharts' | 'vchart';
  dashboard_id?: string;
  dashboard_name?: string;
  display_order?: number;
  enabled: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface KpiEvalResult {
  kpi_id: string;
  name: string;
  value: number | null;
  groups?: Array<{ group: Record<string, unknown>; value: number }>;
  error?: string;
  visualization?: KpiDefinition['visualization'];
  vchart_spec?: Record<string, unknown>;
  renderer?: 'recharts' | 'vchart';
  computed_at: string;
}

export interface BatchImportResult {
  summary: { dashboards: number; created: number; updated: number; failed: number };
  results: Array<{
    dashboard_id: string;
    created: string[];
    updated: string[];
    failed: Array<{ kpi_id?: string; name: string; error: string }>;
  }>;
}

export function getKpiDefinitions() {
  return fetchJson<KpiDefinition[]>('/kpi/definitions');
}

export function getKpiDefinition(id: string) {
  return fetchJson<KpiDefinition>(`/kpi/definitions/${id}`);
}

export function createKpiDefinition(data: Partial<KpiDefinition>) {
  return fetchJson<KpiDefinition>('/kpi/definitions', { method: 'POST', body: JSON.stringify(data) });
}

export function updateKpiDefinition(id: string, data: Partial<KpiDefinition>) {
  return fetchJson<KpiDefinition>(`/kpi/definitions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteKpiDefinition(id: string) {
  return fetchJson<{ deleted: boolean }>(`/kpi/definitions/${id}`, { method: 'DELETE' });
}

export function evaluateKpi(id: string, params?: Record<string, string | undefined>) {
  return fetchJson<KpiEvalResult>(`/kpi/custom/${id}/evaluate${toQueryString(params)}`);
}

export function previewKpiFormula(data: { formula: string; variables: KpiDefinition['variables']; filters?: KpiDefinition['filters']; group_by?: string[]; runtime_filters?: Record<string, unknown> }) {
  return fetchJson<KpiEvalResult>('/kpi/custom/preview', { method: 'POST', body: JSON.stringify(data) });
}

export function importKpiDashboards(data: unknown) {
  return fetchJson<BatchImportResult>('/kpi/definitions/import', { method: 'POST', body: JSON.stringify(data) });
}

/* ── Simulation ──────────────────────────────────────── */

export interface SimVehicle {
  vin: string;
  plate_type: 'permanent' | 'temporary';
  model_code: string;
  vehicle_platform: string;
  sensor_suite_version: string;
  soc_architecture: string;
}

export interface RoadRouteResult {
  coordinates: Array<{ lat: number; lng: number }>;
  segments: Array<{ from: { lat: number; lng: number }; to: { lat: number; lng: number }; distance_m: number; duration_s: number; heading_deg: number }>;
  total_distance_m: number;
  total_duration_s: number;
}

export interface SimRoute {
  route_id: string;
  name?: string;
  waypoints: Array<{ lat: number; lng: number }>;
  road?: RoadRouteResult;
}

export interface VehicleAssignment {
  vin: string;
  project_id: string;
  task_id: string;
  route_id?: string;
}

export interface SimulationSession {
  session_id: string;
  name: string;
  status: 'Draft' | 'Running' | 'Paused' | 'Completed' | 'Aborted';
  fleet_config: {
    mode: 'random' | 'custom';
    vehicle_count: number;
    vehicles?: SimVehicle[];
    vehicle_template?: Partial<SimVehicle>;
  };
  route_config: {
    mode: 'random' | 'custom';
    routes?: SimRoute[];
    random_config?: {
      start_point: { lat: number; lng: number };
      radius_km: number;
      min_waypoints: number;
      max_waypoints: number;
    };
  };
  report_config: {
    telemetry_interval_ms: number;
    issue_interval_range_ms: [number, number];
    status_change_interval_ms: number;
    speed_range_mps: [number, number];
  };
  assignments: VehicleAssignment[];
  started_at?: string;
  stopped_at?: string;
  stats: { telemetry_sent: number; issues_sent: number; total_mileage_km: number };
  live_stats?: { telemetry_sent: number; issues_sent: number; total_mileage_km: number; vehicle_count: number };
  created_at?: string;
  updated_at?: string;
}

export function getSimulations(params?: Record<string, string | undefined>) {
  return fetchJson<SimulationSession[]>(`/simulations${toQueryString(params)}`);
}

export function getSimulation(id: string) {
  return fetchJson<SimulationSession>(`/simulations/${id}`);
}

export function createSimulation(data: Partial<SimulationSession>) {
  return fetchJson<SimulationSession>('/simulations', { method: 'POST', body: JSON.stringify(data) });
}

export function updateSimulation(id: string, data: Partial<SimulationSession>) {
  return fetchJson<SimulationSession>(`/simulations/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteSimulation(id: string) {
  return fetchJson<{ deleted: boolean }>(`/simulations/${id}`, { method: 'DELETE' });
}

export function startSimulation(id: string) {
  return fetchJson<{ started: boolean }>(`/simulations/${id}/start`, { method: 'POST' });
}

export function pauseSimulation(id: string) {
  return fetchJson<{ paused: boolean }>(`/simulations/${id}/pause`, { method: 'POST' });
}

export function resumeSimulation(id: string) {
  return fetchJson<{ resumed: boolean }>(`/simulations/${id}/resume`, { method: 'POST' });
}

export function stopSimulation(id: string) {
  return fetchJson<{ stopped: boolean; stats: SimulationSession['stats'] }>(`/simulations/${id}/stop`, { method: 'POST' });
}

export function getSimulationStats(id: string) {
  return fetchJson<SimulationSession['stats'] & { vehicle_count?: number }>(`/simulations/${id}/stats`);
}

export interface VehicleTrailPoint {
  lat: number;
  lng: number;
  speed_mps: number;
  heading_deg?: number;
  driving_mode: string;
  timestamp: string;
}

export interface SimVehiclePosition {
  vin: string;
  run_id: string;
  current: VehicleTrailPoint | null;
  trail: VehicleTrailPoint[];
}

export function getSimulationVehicles(id: string, tail = 30) {
  return fetchJson<SimVehiclePosition[]>(`/simulations/${id}/vehicles?tail=${tail}`);
}

export function generateSimRoutes(data: { start_point: { lat: number; lng: number }; radius_km?: number; count?: number; min_waypoints?: number; max_waypoints?: number; target_distance_km?: number }) {
  return fetchJson<{ routes: SimRoute[] }>('/simulations/generate-routes', { method: 'POST', body: JSON.stringify(data) });
}

export function generateSimFleet(data: { count?: number; template?: Partial<SimVehicle> }) {
  return fetchJson<{ vehicles: SimVehicle[] }>('/simulations/generate-fleet', { method: 'POST', body: JSON.stringify(data) });
}

export function planRoadRoute(waypoints: Array<{ lat: number; lng: number }>) {
  return fetchJson<RoadRouteResult>('/simulations/plan-road-route', { method: 'POST', body: JSON.stringify({ waypoints }) });
}

export function snapRoutesToRoads(routes: SimRoute[]) {
  return fetchJson<{ routes: SimRoute[] }>('/simulations/snap-routes', { method: 'POST', body: JSON.stringify({ routes }) });
}

/* ── PTC (Project-Task-Car Binding) ──────────────────── */

export interface PtcProject {
  project_id: string;
  name: string;
  task_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PtcTask {
  task_id: string;
  project_id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface PtcBindingDrive {
  drive_id: string;
  selected: boolean;
  deselect_reason_preset?: string;
  deselect_reason_text?: string;
  detail?: PtcDrive;
}

export interface PtcBindingCar {
  car_id: string;
  drives: PtcBindingDrive[];
}

export interface PtcBinding {
  binding_id: string;
  task_id: string;
  status: 'Draft' | 'Published';
  filter_criteria: { builds: string[]; cars: string[]; tags: string[] };
  cars: PtcBindingCar[];
  created_at: string;
  updated_at: string;
}

export interface PtcBuild {
  build_id: string;
  version_tag: string;
  build_time?: string;
}

export interface PtcCar {
  car_id: string;
  name: string;
  vin?: string;
}

export interface PtcTag {
  tag_id: string;
  name: string;
}

export interface PtcDrive {
  drive_id: string;
  car_id: string;
  build_id: string;
  tag_id: string;
  date: string;
  start_time: string;
  end_time: string;
  mileage_km: number;
  xl_events: number;
  l_events: number;
  hotline_count: number;
  route?: string;
}

export interface PtcTaskSummary {
  task_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  binding_status: string | null;
  build_count: number;
  car_count: number;
  tag_count: number;
  hotline_count: number;
  total_mileage: number;
  daily_mileage: Array<{ date: string; km: number }>;
  updated_at: string;
}

export interface PtcOverviewProject extends PtcProject {
  tasks?: PtcTaskSummary[];
}

export interface PtcFilterResultDrive {
  drive_id: string;
  date: string;
  mileage_km: number;
  start_time: string;
  end_time: string;
}

export interface PtcFilterResult {
  car_id: string;
  drive_count: number;
  total_mileage: number;
  hotline_count: number;
  builds: string[];
  tags: string[];
  date_range: { start: string; end: string };
  drives: PtcFilterResultDrive[];
}

export function getPtcProjects(q?: string) {
  return fetchJson<PtcProject[]>(`/ptc/projects${q ? `?q=${encodeURIComponent(q)}` : ''}`);
}

export function createPtcProject(name: string) {
  return fetchJson<PtcProject>('/ptc/projects', { method: 'POST', body: JSON.stringify({ name }) });
}

export function updatePtcProject(id: string, name: string) {
  return fetchJson<PtcProject>(`/ptc/projects/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
}

export function deletePtcProject(id: string) {
  return fetchJson<{ deleted: boolean }>(`/ptc/projects/${id}`, { method: 'DELETE' });
}

export function getPtcTasks(params?: { q?: string; project_id?: string }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.project_id) qs.set('project_id', params.project_id);
  const s = qs.toString();
  return fetchJson<PtcTask[]>(`/ptc/tasks${s ? `?${s}` : ''}`);
}

export function createPtcTask(data: { name: string; project_id?: string; project_name?: string }) {
  return fetchJson<PtcTask>('/ptc/tasks', { method: 'POST', body: JSON.stringify(data) });
}

export function updatePtcTask(id: string, data: { name?: string; project_id?: string }) {
  return fetchJson<PtcTask>(`/ptc/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deletePtcTask(id: string) {
  return fetchJson<{ deleted: boolean }>(`/ptc/tasks/${id}`, { method: 'DELETE' });
}

export function getPtcBindings(params?: { project_id?: string; task_id?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.project_id) qs.set('project_id', params.project_id);
  if (params?.task_id) qs.set('task_id', params.task_id);
  if (params?.status) qs.set('status', params.status);
  const s = qs.toString();
  return fetchJson<PtcBinding[]>(`/ptc/bindings${s ? `?${s}` : ''}`);
}

export function getPtcBinding(id: string) {
  return fetchJson<PtcBinding>(`/ptc/bindings/${id}`);
}

export function createPtcBinding(data: {
  task_id: string;
  filter_criteria?: PtcBinding['filter_criteria'];
  car_ids?: string[];
  cars?: Array<{ car_id: string; drives: Array<{ drive_id: string; selected: boolean }> }>;
  status?: string;
}) {
  return fetchJson<PtcBinding>('/ptc/bindings', { method: 'POST', body: JSON.stringify(data) });
}

export function updatePtcBinding(id: string, data: Partial<PtcBinding>) {
  return fetchJson<PtcBinding>(`/ptc/bindings/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function updatePtcBindingDrives(id: string, data: { car_id: string; drive_updates: Array<{ drive_id: string; selected: boolean; deselect_reason_preset?: string; deselect_reason_text?: string }> }) {
  return fetchJson<PtcBinding>(`/ptc/bindings/${id}/drives`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deletePtcBinding(id: string) {
  return fetchJson<{ deleted: boolean }>(`/ptc/bindings/${id}`, { method: 'DELETE' });
}

export function getPtcBuilds(q?: string) {
  return fetchJson<PtcBuild[]>(`/ptc/builds${q ? `?q=${encodeURIComponent(q)}` : ''}`);
}

export function getPtcCars(params?: { q?: string; build_id?: string; tag_id?: string }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.build_id) qs.set('build_id', params.build_id);
  if (params?.tag_id) qs.set('tag_id', params.tag_id);
  const s = qs.toString();
  return fetchJson<PtcCar[]>(`/ptc/cars${s ? `?${s}` : ''}`);
}

export function getPtcTags(q?: string) {
  return fetchJson<PtcTag[]>(`/ptc/tags${q ? `?q=${encodeURIComponent(q)}` : ''}`);
}

export function getPtcDrives(params?: { car_id?: string; build_id?: string; tag_id?: string; q?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.car_id) qs.set('car_id', params.car_id);
  if (params?.build_id) qs.set('build_id', params.build_id);
  if (params?.tag_id) qs.set('tag_id', params.tag_id);
  if (params?.q) qs.set('q', params.q);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const s = qs.toString();
  return fetchJson<{ data: PtcDrive[]; total: number; page: number; limit: number }>(`/ptc/drives${s ? `?${s}` : ''}`);
}

export function filterPtcDrives(params: { builds?: string; cars?: string; tags?: string }) {
  const qs = new URLSearchParams();
  if (params.builds) qs.set('builds', params.builds);
  if (params.cars) qs.set('cars', params.cars);
  if (params.tags) qs.set('tags', params.tags);
  return fetchJson<PtcFilterResult[]>(`/ptc/drives/filter?${qs.toString()}`);
}

export function getPtcOverview(project_id?: string) {
  if (project_id) {
    return fetchJson<{ project: PtcProject; tasks: PtcTaskSummary[] }>(`/ptc/overview?project_id=${project_id}`);
  }
  return fetchJson<PtcOverviewProject[]>('/ptc/overview');
}

export function getPtcTaskOverview(taskId: string) {
  return fetchJson<{ task: PtcTask; binding: PtcBinding | null; drives: PtcDrive[] }>(`/ptc/overview/${taskId}`);
}
