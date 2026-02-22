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
  const normalized = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  ) as Record<string, string>;
  const query = new URLSearchParams(normalized).toString();
  return query ? `?${query}` : '';
}

export async function getProjects(params?: Record<string, string | undefined>) {
  const qs = toQueryString(params);
  const data = await fetchJson<Project[] | { items: Project[] }>(`/projects${qs}`);
  return Array.isArray(data) ? data : data.items ?? [];
}

export function getProject(id: string) {
  return fetchJson<Project>(`/projects/${id}`);
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
  return fetchJson<Task[]>(`/tasks${qs}`);
}

export function getTask(id: string) {
  return fetchJson<Task>(`/tasks/${id}`);
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
  return fetchJson<Run[]>(`/runs${qs}`);
}

export function getRun(id: string) {
  return fetchJson<Run>(`/runs/${id}`);
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
  return fetchJson<Issue[]>(`/issues${qs}`);
}

export function getIssue(id: string) {
  return fetchJson<Issue>(`/issues/${id}`);
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
  return Array.isArray(data) ? { items: data } : data;
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
  return fetchJson<CoverageResult>(`/traceability/coverage`);
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
  return fetchJson<KpiValue>(`/kpi/issue-convergence${qs}`);
}
