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
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  name: string;
  status: string;
  platform?: string;
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
    createdAt: str(raw.createdAt ?? raw.created_at, new Date().toISOString()),
    updatedAt: str(raw.updatedAt ?? raw.updated_at, new Date().toISOString()),
  };
}

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
    createdAt: str(raw.createdAt ?? raw.created_at, new Date().toISOString()),
    updatedAt: str(raw.updatedAt ?? raw.updated_at, new Date().toISOString()),
  };
}

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
    createdAt: str(raw.createdAt ?? raw.created_at, new Date().toISOString()),
    updatedAt: str(raw.updatedAt ?? raw.updated_at, new Date().toISOString()),
  };
}

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
  return fetchJson<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
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
  return fetchJson<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function advanceTaskStage(id: string, stage: string) {
  return fetchJson<Task>(`/tasks/${id}/advance`, { method: 'POST', body: JSON.stringify({ stage }) });
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

export function getVehicles() {
  return fetchJson<Vehicle[]>('/vehicles');
}

export function getVehicle(id: string) {
  return fetchJson<Vehicle>(`/vehicles/${id}`);
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
