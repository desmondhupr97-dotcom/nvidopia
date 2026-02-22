import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getMpi, getMttr, getRegressionPassRate, getFleetUtilization, getIssueConvergence, getProjects } from '../api/client';

// --- Dashboard-as-Code config ---

interface GridPosition { x: number; y: number; w: number; h: number }
interface DataTarget { datasource_type: string; metric_query: string; legend?: string }
interface PresentationOptions { unit_format?: string; decimals?: number; color_scheme?: string }
interface PanelConfig {
  panel_id: string;
  title: string;
  description?: string;
  visualization_type: 'stat' | 'gauge' | 'timeseries';
  grid_position: GridPosition;
  data_targets: DataTarget[];
  presentation_options?: PresentationOptions;
}

interface DashboardConfig {
  dashboard_id: string;
  title: string;
  description?: string;
  global_refresh_rate: number;
  panels: PanelConfig[];
}

const DASHBOARD_CONFIG: DashboardConfig = {
  dashboard_id: 'kpi-overview',
  title: 'KPI Overview Dashboard',
  description: 'Key performance indicators for autonomous driving test campaigns',
  global_refresh_rate: 30,
  panels: [
    {
      panel_id: 'mpi',
      title: 'Miles Per Intervention',
      visualization_type: 'stat',
      grid_position: { x: 0, y: 0, w: 6, h: 4 },
      data_targets: [{ datasource_type: 'kafka_aggregated_kpi', metric_query: 'mpi' }],
      presentation_options: { unit_format: 'km', decimals: 1 },
    },
    {
      panel_id: 'mttr',
      title: 'Mean Time To Resolution',
      visualization_type: 'stat',
      grid_position: { x: 6, y: 0, w: 6, h: 4 },
      data_targets: [{ datasource_type: 'kafka_aggregated_kpi', metric_query: 'mttr' }],
      presentation_options: { unit_format: 'hours', decimals: 1 },
    },
    {
      panel_id: 'regression-pass-rate',
      title: 'Regression Pass Rate',
      visualization_type: 'gauge',
      grid_position: { x: 12, y: 0, w: 6, h: 4 },
      data_targets: [{ datasource_type: 'kafka_aggregated_kpi', metric_query: 'regression_pass_rate' }],
      presentation_options: { unit_format: '%', decimals: 1 },
    },
    {
      panel_id: 'fleet-utilization',
      title: 'Fleet Utilization',
      visualization_type: 'gauge',
      grid_position: { x: 18, y: 0, w: 6, h: 4 },
      data_targets: [{ datasource_type: 'kafka_aggregated_kpi', metric_query: 'fleet_utilization' }],
      presentation_options: { unit_format: '%', decimals: 1 },
    },
    {
      panel_id: 'issue-convergence',
      title: 'Issue Convergence',
      description: 'New vs closed issues over time',
      visualization_type: 'timeseries',
      grid_position: { x: 0, y: 4, w: 24, h: 8 },
      data_targets: [
        { datasource_type: 'kafka_aggregated_kpi', metric_query: 'issue_convergence', legend: 'Open' },
        { datasource_type: 'kafka_aggregated_kpi', metric_query: 'issue_convergence_closed', legend: 'Closed' },
      ],
      presentation_options: { color_scheme: 'diverging' },
    },
  ],
};

// --- Panel renderers ---

function StatPanel({ title, value, unit, trend }: { title: string; value: number | null; unit: string; trend?: number[] }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="mt-2">
        <span className="text-3xl font-bold text-gray-900">
          {value != null ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}
        </span>
        <span className="ml-1 text-lg text-gray-400">{unit}</span>
      </div>
      {trend && trend.length > 1 && (
        <div className="mt-3 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend.map((v, i) => ({ i, v }))}>
              <Line type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function GaugePanel({ title, value, unit }: { title: string; value: number | null; unit: string }) {
  const pct = value != null ? Math.min(100, Math.max(0, value)) : 0;
  const color = pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500';
  const bg = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="mt-2 flex items-end gap-2">
        <span className={clsx('text-3xl font-bold', color)}>
          {value != null ? value.toFixed(1) : '—'}
        </span>
        <span className="mb-0.5 text-lg text-gray-400">{unit}</span>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div className={clsx('h-full rounded-full transition-all duration-500', bg)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ConvergencePanel({ title, data }: { title: string; data: Array<{ timestamp: string; open: number; closed: number }> }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-medium text-gray-500">{title}</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="timestamp" tick={{ fontSize: 11 }} tickFormatter={(v) => new Date(v).toLocaleDateString()} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip labelFormatter={(v) => new Date(v as string).toLocaleDateString()} />
            <Legend />
            <Area type="monotone" dataKey="open" stackId="1" stroke="#f59e0b" fill="#fef3c7" name="Open" />
            <Area type="monotone" dataKey="closed" stackId="2" stroke="#6366f1" fill="#e0e7ff" name="Closed" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">No data available</div>
      )}
    </div>
  );
}

// --- Main page ---

export default function KpiDashboardPage() {
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [interval, setInterval] = useState<'day' | 'week' | 'month'>('day');
  const [enabledPanels, setEnabledPanels] = useState<Record<string, boolean>>(
    Object.fromEntries(DASHBOARD_CONFIG.panels.map((panel) => [panel.panel_id, true])) as Record<string, boolean>,
  );

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects({}),
  });

  const queryParams = {
    project_id: projectId || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  };

  const { data: mpiData } = useQuery({
    queryKey: ['kpi-mpi', projectId, startDate, endDate],
    queryFn: () => getMpi(queryParams),
    enabled: !!projectId,
  });

  const { data: mttrData } = useQuery({
    queryKey: ['kpi-mttr', projectId, startDate, endDate],
    queryFn: () => getMttr(queryParams),
    enabled: !!projectId,
  });

  const { data: rprData } = useQuery({
    queryKey: ['kpi-rpr', projectId],
    queryFn: () => getRegressionPassRate({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: fleetData } = useQuery({
    queryKey: ['kpi-fleet', projectId, startDate, endDate],
    queryFn: () => getFleetUtilization(queryParams),
    enabled: !!projectId,
  });

  const { data: convergenceData } = useQuery({
    queryKey: ['kpi-convergence', projectId, startDate, endDate, interval],
    queryFn: () => getIssueConvergence({ ...queryParams, interval }),
    enabled: !!projectId,
  });

  const convergencePoints: Array<{ timestamp: string; open: number; closed: number }> =
    convergenceData?.points?.map((p: Record<string, unknown>) => ({
      timestamp: p.timestamp as string,
      open: Number((p.dimensions as Record<string, unknown> | undefined)?.open_count ?? p.value ?? 0),
      closed: Number((p.dimensions as Record<string, unknown> | undefined)?.closed_count ?? 0),
    })) ?? [];

  const renderPanel = (panel: PanelConfig) => {
    const opts = panel.presentation_options;
    switch (panel.visualization_type) {
      case 'stat': {
        const dataMap: Record<string, { data: Record<string, unknown> | undefined }> = {
          mpi: { data: mpiData },
          mttr: { data: mttrData },
        };
        const metricQuery = panel.data_targets[0]?.metric_query ?? '';
        const resolved = dataMap[metricQuery];
        return (
          <StatPanel
            key={panel.panel_id}
            title={panel.title}
            value={resolved?.data?.value != null ? Number(resolved.data.value) : null}
            unit={opts?.unit_format ?? ''}
          />
        );
      }
      case 'gauge': {
        const dataMap: Record<string, { data: Record<string, unknown> | undefined }> = {
          regression_pass_rate: { data: rprData },
          fleet_utilization: { data: fleetData },
        };
        const metricQuery = panel.data_targets[0]?.metric_query ?? '';
        const resolved = dataMap[metricQuery];
        return (
          <GaugePanel
            key={panel.panel_id}
            title={panel.title}
            value={resolved?.data?.value != null ? Number(resolved.data.value) : null}
            unit={opts?.unit_format ?? ''}
          />
        );
      }
      case 'timeseries':
        return <ConvergencePanel key={panel.panel_id} title={panel.title} data={convergencePoints} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{DASHBOARD_CONFIG.title}</h1>
            {DASHBOARD_CONFIG.description && (
              <p className="text-sm text-gray-500">{DASHBOARD_CONFIG.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Select Project</option>
            {projectsData?.map((p: Record<string, unknown>) => (
              <option key={p.id as string} value={p.id as string}>{p.name as string}</option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value as 'day' | 'week' | 'month')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700">KPI Panel Configuration</h2>
        <p className="mt-1 text-xs text-gray-500">Select which KPI panels should be shown.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {DASHBOARD_CONFIG.panels.map((panel) => (
            <label key={panel.panel_id} className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={enabledPanels[panel.panel_id] ?? false}
                onChange={(e) => {
                  setEnabledPanels((prev) => ({ ...prev, [panel.panel_id]: e.target.checked }));
                }}
              />
              {panel.title}
            </label>
          ))}
        </div>
      </div>

      {!projectId && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16">
          <TrendingUp className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-400">Select a project to view KPI metrics</p>
        </div>
      )}

      {projectId && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DASHBOARD_CONFIG.panels
              .filter((p) => (enabledPanels[p.panel_id] ?? true) && (p.visualization_type === 'stat' || p.visualization_type === 'gauge'))
              .map(renderPanel)}
          </div>
          {DASHBOARD_CONFIG.panels
            .filter((p) => (enabledPanels[p.panel_id] ?? true) && p.visualization_type === 'timeseries')
            .map(renderPanel)}
        </>
      )}
    </div>
  );
}
