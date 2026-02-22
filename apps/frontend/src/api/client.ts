const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/* ── Types ────────────────────────────────────────────── */

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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
  runId?: string;
  taskId?: string;
  assignee?: string;
  triageResult?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueTransition {
  from: string;
  to: string;
  action: string;
}

export interface TraceResult {
  nodes: Array<{ id: string; type: string; label: string }>;
  edges: Array<{ source: string; target: string }>;
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

export function getProjects() {
  return fetchJson<Project[]>('/projects');
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

export function getTasks(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
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

export function getRuns(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
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

export function getIssues(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
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

export function transitionIssue(id: string, action: string) {
  return fetchJson<Issue>(`/issues/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

export function triageIssue(id: string) {
  return fetchJson<Issue>(`/issues/${id}/triage`, {
    method: 'POST',
  });
}

export function getIssueTransitions(id: string) {
  return fetchJson<IssueTransition[]>(`/issues/${id}/transitions`);
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

export function getCoverage(projectId: string) {
  return fetchJson<CoverageResult>(`/traceability/coverage/${projectId}`);
}

/* ── KPI ──────────────────────────────────────────────── */

export function getMpi(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchJson<KpiValue>(`/kpi/mpi${qs}`);
}

export function getMttr(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchJson<KpiValue>(`/kpi/mttr${qs}`);
}

export function getRegressionPassRate(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchJson<KpiValue>(`/kpi/regression-pass-rate${qs}`);
}

export function getFleetUtilization(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchJson<KpiValue>(`/kpi/fleet-utilization${qs}`);
}

export function getIssueConvergence(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchJson<KpiValue>(`/kpi/issue-convergence${qs}`);
}
