import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/client';

const KEYS = {
  projects: ['ptc-projects'] as const,
  tasks: (projectId?: string) => ['ptc-tasks', projectId] as const,
  overview: ['ptc-overview'] as const,
  overviewProject: (id: string) => ['ptc-overview', id] as const,
  overviewTask: (id: string) => ['ptc-overview-task', id] as const,
  bindings: (params?: Record<string, string>) => ['ptc-bindings', params] as const,
  binding: (id: string) => ['ptc-binding', id] as const,
  builds: (q?: string) => ['ptc-builds', q] as const,
  cars: (params?: Record<string, string>) => ['ptc-cars', params] as const,
  tags: (q?: string) => ['ptc-tags', q] as const,
  drives: (params?: Record<string, string>) => ['ptc-drives', params] as const,
  driveFilter: (params?: Record<string, string>) => ['ptc-drive-filter', params] as const,
};

export function usePtcProjects(q?: string) {
  return useQuery({ queryKey: [...KEYS.projects, q], queryFn: () => api.getPtcProjects(q) });
}

export function usePtcTasks(params?: { q?: string; project_id?: string }) {
  return useQuery({ queryKey: KEYS.tasks(params?.project_id), queryFn: () => api.getPtcTasks(params) });
}

export function usePtcOverview() {
  return useQuery({
    queryKey: KEYS.overview,
    queryFn: () => api.getPtcOverview() as Promise<api.PtcOverviewProject[]>,
  });
}

export function usePtcOverviewProject(projectId: string, enabled = true) {
  return useQuery({
    queryKey: KEYS.overviewProject(projectId),
    queryFn: () => api.getPtcOverview(projectId) as Promise<{ project: api.PtcProject; tasks: api.PtcTaskSummary[] }>,
    enabled,
  });
}

export function usePtcOverviewTask(taskId: string, enabled = true) {
  return useQuery({
    queryKey: KEYS.overviewTask(taskId),
    queryFn: () => api.getPtcTaskOverview(taskId),
    enabled,
  });
}

export function usePtcBinding(id: string, enabled = true) {
  return useQuery({ queryKey: KEYS.binding(id), queryFn: () => api.getPtcBinding(id), enabled });
}

export function usePtcBindings(params?: { project_id?: string; task_id?: string; status?: string }) {
  return useQuery({ queryKey: KEYS.bindings(params as Record<string, string>), queryFn: () => api.getPtcBindings(params) });
}

export function usePtcBuilds(q?: string) {
  return useQuery({ queryKey: KEYS.builds(q), queryFn: () => api.getPtcBuilds(q) });
}

export function usePtcCars(params?: { q?: string; build_id?: string; tag_id?: string }) {
  return useQuery({ queryKey: KEYS.cars(params as Record<string, string>), queryFn: () => api.getPtcCars(params) });
}

export function usePtcTags(q?: string) {
  return useQuery({ queryKey: KEYS.tags(q), queryFn: () => api.getPtcTags(q) });
}

export function usePtcDriveFilter(params: { builds?: string; cars?: string; tags?: string }, enabled = true) {
  return useQuery({
    queryKey: KEYS.driveFilter(params as Record<string, string>),
    queryFn: () => api.filterPtcDrives(params),
    enabled,
  });
}

export function useCreatePtcProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createPtcProject(name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.projects }); qc.invalidateQueries({ queryKey: KEYS.overview }); },
  });
}

export function useCreatePtcTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; project_id?: string; project_name?: string }) => api.createPtcTask(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ptc'] }); },
  });
}

export function useUpdatePtcTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; project_id?: string } }) => api.updatePtcTask(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ptc'] }); },
  });
}

export function useCreatePtcBinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.createPtcBinding>[0]) => api.createPtcBinding(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ptc'] }); },
  });
}

export function useUpdatePtcBinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<api.PtcBinding> }) => api.updatePtcBinding(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ptc'] }); },
  });
}

export function useUpdatePtcBindingDrives() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updatePtcBindingDrives>[1] }) => api.updatePtcBindingDrives(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ptc'] }); },
  });
}

export function useDeletePtcBinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePtcBinding(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ptc'] }); },
  });
}

export function useDeletePtcProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePtcProject(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ptc'] }); },
  });
}

export function useDeletePtcTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePtcTask(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ptc'] }); },
  });
}
