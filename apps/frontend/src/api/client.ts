const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/* ── Types ────────────────────────────────────────────── */

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  stage: string;
  priority: string;
  assignee?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface Run {
  id: string;
  taskId: string;
  status: string;
  vehicleIds?: string[];
  startedAt?: string;
  completedAt?: string;
  result?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface Vehicle {
  id: string;
  name: string;
  status: string;
  platform?: string;
  [key: string]: unknown;
}

export interface Issue {
  id: string;
  issue_id?: string;
  title: string;
  description?: string;
  status: string;
  severity: string;
  runId?: string;
  run_id?: string;
  taskId?: string;
  task_id?: string;
  assignee?: string;
  assigned_to?: string;
  assigned_module?: string;
  triageResult?: string;
  category?: string;
  takeover_type?: string;
  module?: string;
  gps_lat?: number;
  gps_lng?: number;
  data_snapshot_uri?: string;
  trigger_timestamp?: string;
  fault_codes?: string[];
  environment_tags?: string[];
  triage_mode?: string;
  triage_hint?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface IssueTransition {
  id?: string;
  from: string;
  to: string;
  action: string;
  from_status?: string;
  to_status?: string;
  triggered_by?: string;
  transitioned_at?: string;
  reason?: string;
  [key: string]: unknown;
}

export interface TraceResult {
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
  coverage_percentage?: number;
  coverage_percent?: number;
  verified?: number;
  total_requirements?: number;
  verified_requirements?: number;
  details: Array<{ id: string; name: string; covered: boolean }>;
  [key: string]: unknown;
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

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function normalizeProject(raw: AnyRecord): Project {
  return {
    ...raw,
    id: asString(raw.id ?? raw.project_id),
    name: asString(raw.name, 'Unnamed Project'),
    status: asString(raw.status, 'Planning'),
    createdAt: asString(raw.createdAt ?? raw.created_at, new Date().toISOString()),
    updatedAt: asString(raw.updatedAt ?? raw.updated_at, new Date().toISOString()),
  };
}

function normalizeTask(raw: AnyRecord): Task {
  return {
    ...raw,
    id: asString(raw.id ?? raw.task_id),
    projectId: asString(raw.projectId ?? raw.project_id),
    title: asString(raw.title ?? raw.name ?? raw.task_id, 'Untitled Task'),
    description: asOptionalString(raw.description),
    stage: asString(raw.stage ?? raw.status, 'Pending'),
    priority: asString(raw.priority, 'Medium'),
    assignee: asOptionalString(raw.assignee ?? raw.assigned_to),
    createdAt: asString(raw.createdAt ?? raw.created_at, new Date().toISOString()),
    updatedAt: asString(raw.updatedAt ?? raw.updated_at, new Date().toISOString()),
  };
}

function normalizeRun(raw: AnyRecord): Run {
  const vehicleVin = asOptionalString(raw.vehicle_vin);
  return {
    ...raw,
    id: asString(raw.id ?? raw.run_id),
    taskId: asString(raw.taskId ?? raw.task_id),
    status: asString(raw.status, 'Scheduled'),
    vehicleIds: Array.isArray(raw.vehicleIds)
      ? (raw.vehicleIds as string[])
      : vehicleVin
        ? [vehicleVin]
        : [],
    startedAt: asOptionalString(raw.startedAt ?? raw.start_time),
    completedAt: asOptionalString(raw.completedAt ?? raw.end_time),
    result: asOptionalString(raw.result),
    createdAt: asString(raw.createdAt ?? raw.created_at, new Date().toISOString()),
    updatedAt: asString(raw.updatedAt ?? raw.updated_at, new Date().toISOString()),
  };
}

function normalizeIssue(raw: AnyRecord): Issue {
  const issueId = asString(raw.id ?? raw.issue_id);
  const category = asOptionalString(raw.category);
  return {
    ...raw,
    id: issueId,
    title: asString(raw.title, category ? `${category} (${issueId})` : `Issue ${issueId}`),
    status: asString(raw.status, 'New'),
    severity: asString(raw.severity, 'Medium'),
    runId: asOptionalString(raw.runId ?? raw.run_id),
    taskId: asOptionalString(raw.taskId ?? raw.task_id),
    assignee: asOptionalString(raw.assignee ?? raw.assigned_to),
    createdAt: asString(raw.createdAt ?? raw.created_at, new Date().toISOString()),
    updatedAt: asString(raw.updatedAt ?? raw.updated_at, new Date().toISOString()),
    data_snapshot_uri: asOptionalString(raw.data_snapshot_uri ?? raw.data_snapshot_url),
    gps_lat: (raw.gps_lat as number | undefined) ?? ((raw.gps_coordinates as AnyRecord | undefined)?.lat as number | undefined),
    gps_lng: (raw.gps_lng as number | undefined) ?? ((raw.gps_coordinates as AnyRecord | undefined)?.lng as number | undefined),
  };
}

async function fetchJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, body || res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/* ── Projects ─────────────────────────────────────────── */

function toQueryString(params?: Record<string, string | undefined>): string {
  if (!params) return '';
  const aliases: Record<string, string> = {
    projectId: 'project_id',
    taskId: 'task_id',
    runId: 'run_id',
    vehicleVin: 'vehicle_vin',
    startDate: 'start_date',
    endDate: 'end_date',
    timeRange: 'time_range',
  };
  const normalized = Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [aliases[key] ?? key, value]),
  ) as Record<string, string>;
  const query = new URLSearchParams(normalized).toString();
  return query ? `?${query}` : '';
}

export async function getProjects(params?: Record<string, string | undefined>) {
  const qs = toQueryString(params);
  const data = await fetchJson<Project[] | { items: Project[] }>(`/projects${qs}`);
  const items = Array.isArray(data) ? data : data.items ?? [];
  return items.map((item) => normalizeProject(item as unknown as AnyRecord));
}

export function getProject(id: string) {
  return fetchJson<AnyRecord>(`/projects/${id}`).then((data) => normalizeProject(data));
}

export function createProject(data: Partial<Project>) {
  return fetchJson<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateProject(id: string, data: Partial<Project>) {
  return fetchJson<Project>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/* ── Tasks ────────────────────────────────────────────── */

export function getTasks(params?: Record<string, string | undefined>) {
  const qs = toQueryString(params);
  return fetchJson<AnyRecord[]>(`/tasks${qs}`).then((data) => data.map((item) => normalizeTask(item)));
}

export function getTask(id: string) {
  return fetchJson<AnyRecord>(`/tasks/${id}`).then((data) => normalizeTask(data));
}

export function createTask(data: Partial<Task>) {
  return fetchJson<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateTask(id: string, data: Partial<Task>) {
  return fetchJson<Task>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function advanceTaskStage(id: string, stage: string) {
  return fetchJson<Task>(`/tasks/${id}/advance`, {
    method: 'POST',
    body: JSON.stringify({ stage }),
  });
}

/* ── Runs ─────────────────────────────────────────────── */

export function getRuns(params?: Record<string, string | undefined>) {
  const qs = toQueryString(params);
  return fetchJson<AnyRecord[]>(`/runs${qs}`).then((data) => data.map((item) => normalizeRun(item)));
}

export function getRun(id: string) {
  return fetchJson<AnyRecord>(`/runs/${id}`).then((data) => normalizeRun(data));
}

export function createRun(data: Partial<Run>) {
  return fetchJson<Run>('/runs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateRun(id: string, data: Partial<Run>) {
  return fetchJson<Run>(`/runs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function assignVehicles(runId: string, vehicleIds: string[]) {
  return fetchJson<Run>(`/runs/${runId}/vehicles`, {
    method: 'POST',
    body: JSON.stringify({ vehicleIds }),
  });
}

/* ── Vehicles ─────────────────────────────────────────── */

export function getVehicles() {
  return fetchJson<Vehicle[]>('/vehicles');
}

export function getVehicle(id: string) {
  return fetchJson<Vehicle>(`/vehicles/${id}`);
}

/* ── Issues ───────────────────────────────────────────── */

export function getIssues(params?: Record<string, string | undefined>) {
  const qs = toQueryString(params);
  return fetchJson<AnyRecord[]>(`/issues${qs}`).then((data) => data.map((item) => normalizeIssue(item)));
}

export function getIssue(id: string) {
  return fetchJson<AnyRecord>(`/issues/${id}`).then((data) => normalizeIssue(data));
}

export function createIssue(data: Partial<Issue>) {
  return fetchJson<Issue>('/issues', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateIssue(id: string, data: Partial<Issue>) {
  return fetchJson<Issue>(`/issues/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function transitionIssue(
  id: string,
  payload: { to_status: string; triggered_by: string; reason?: string },
) {
  return fetchJson<Issue>(`/issues/${id}/transition`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
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
  const data = await fetchJson<IssueTransition[] | { items: IssueTransition[] }>(`/issues/${id}/transitions`);
  const items = (Array.isArray(data) ? data : data.items ?? []).map((item) => ({
    ...item,
    id: item.id ?? (item as AnyRecord).transition_id,
    transitioned_at: item.transitioned_at ?? (item as AnyRecord).created_at as string | undefined,
  }));
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

export function traceForward(requirementId: string) {
  return getForwardTrace(requirementId);
}

export function traceBackward(issueId: string) {
  return getBackwardTrace(issueId);
}

export function getCoverage(_params?: Record<string, unknown>) {
  return fetchJson<AnyRecord>(`/traceability/coverage`).then((raw) => ({
    total: Number(raw.total ?? raw.total_requirements ?? 0),
    covered: Number(raw.covered ?? raw.covered_requirements ?? 0),
    percentage: Number(raw.percentage ?? raw.coverage_percentage ?? 0),
    coverage_percentage: Number(raw.coverage_percentage ?? 0),
    coverage_percent: Number(raw.coverage_percent ?? raw.coverage_percentage ?? 0),
    verified: Number(raw.verified ?? raw.covered_requirements ?? 0),
    total_requirements: Number(raw.total_requirements ?? raw.total ?? 0),
    verified_requirements: Number(raw.verified_requirements ?? raw.covered_requirements ?? 0),
    details: Array.isArray(raw.details) ? raw.details as CoverageResult['details'] : [],
  }));
}

/* ── KPI ──────────────────────────────────────────────── */

export function getMpi(params?: Record<string, string | undefined>) {
  const qs = toQueryString(params);
  return fetchJson<KpiValue>(`/kpi/mpi${qs}`);
}

export function getMttr(params?: Record<string, string | undefined>) {
  const qs = toQueryString(params);
  return fetchJson<KpiValue>(`/kpi/mttr${qs}`);
}

export function getRegressionPassRate(params?: Record<string, string | undefined>) {
  const qs = toQueryString(params);
  return fetchJson<KpiValue>(`/kpi/regression-pass-rate${qs}`);
}

export function getFleetUtilization(params?: Record<string, string | undefined>) {
  const qs = toQueryString(params);
  return fetchJson<KpiValue>(`/kpi/fleet-utilization${qs}`);
}

export function getIssueConvergence(params?: Record<string, string | undefined>) {
  const qs = toQueryString(params);
  return fetchJson<AnyRecord>(`/kpi/issue-convergence${qs}`).then((raw) => {
    const series = Array.isArray(raw.series) ? (raw.series as AnyRecord[]) : [];
    const points = series.map((row) => ({
      timestamp: asString(row.date),
      value: Number(row.new_issues ?? 0),
      dimensions: {
        open_count: Number(row.new_issues ?? 0),
        closed_count: Number(row.closed_issues ?? 0),
      },
    }));
    return {
      value: Number(raw.value ?? 0),
      unit: asString(raw.unit, ''),
      points,
      ...raw,
    } as KpiValue;
  });
}
