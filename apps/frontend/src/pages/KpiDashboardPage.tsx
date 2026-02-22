import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Statistic, Progress, Select, Space, Checkbox, Row, Col, Empty } from 'antd';
import { BarChart3, TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getMpi, getMttr, getRegressionPassRate, getFleetUtilization, getIssueConvergence, getProjects } from '../api/client';

interface PanelConfig {
  id: string;
  title: string;
  description?: string;
  type: 'stat' | 'gauge' | 'timeseries';
  unit: string;
  metric: string;
}

const PANELS: PanelConfig[] = [
  { id: 'mpi', title: 'Miles Per Intervention', type: 'stat', unit: 'km', metric: 'mpi' },
  { id: 'mttr', title: 'Mean Time To Resolution', type: 'stat', unit: 'hours', metric: 'mttr' },
  { id: 'rpr', title: 'Regression Pass Rate', type: 'gauge', unit: '%', metric: 'regression_pass_rate' },
  { id: 'fleet', title: 'Fleet Utilization', type: 'gauge', unit: '%', metric: 'fleet_utilization' },
  { id: 'convergence', title: 'Issue Convergence', type: 'timeseries', unit: '', metric: 'convergence' },
];

function gaugeColor(pct: number): string {
  if (pct >= 80) return '#22c55e';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

export default function KpiDashboardPage() {
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [interval, setInterval] = useState<'day' | 'week' | 'month'>('day');
  const [enabledPanels, setEnabledPanels] = useState<Record<string, boolean>>(
    Object.fromEntries(PANELS.map((p) => [p.id, true])),
  );

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects({}),
  });

  const qp = {
    project_id: projectId || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  };

  const { data: mpiData } = useQuery({
    queryKey: ['kpi-mpi', projectId, startDate, endDate],
    queryFn: () => getMpi(qp),
    enabled: !!projectId,
  });

  const { data: mttrData } = useQuery({
    queryKey: ['kpi-mttr', projectId, startDate, endDate],
    queryFn: () => getMttr(qp),
    enabled: !!projectId,
  });

  const { data: rprData } = useQuery({
    queryKey: ['kpi-rpr', projectId],
    queryFn: () => getRegressionPassRate({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: fleetData } = useQuery({
    queryKey: ['kpi-fleet', projectId, startDate, endDate],
    queryFn: () => getFleetUtilization(qp),
    enabled: !!projectId,
  });

  const { data: convergenceData } = useQuery({
    queryKey: ['kpi-convergence', projectId, startDate, endDate, interval],
    queryFn: () => getIssueConvergence({ ...qp, interval }),
    enabled: !!projectId,
  });

  const convergencePoints: Array<{ timestamp: string; open: number; closed: number }> =
    convergenceData?.points?.map((p: Record<string, unknown>) => ({
      timestamp: p.timestamp as string,
      open: Number((p.dimensions as Record<string, unknown> | undefined)?.open_count ?? p.value ?? 0),
      closed: Number((p.dimensions as Record<string, unknown> | undefined)?.closed_count ?? 0),
    })) ?? [];

  const dataMap: Record<string, number | null> = {
    mpi: mpiData?.value != null ? Number(mpiData.value) : null,
    mttr: mttrData?.value != null ? Number(mttrData.value) : null,
    regression_pass_rate: rprData?.value != null ? Number(rprData.value) : null,
    fleet_utilization: fleetData?.value != null ? Number(fleetData.value) : null,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BarChart3 size={28} style={{ color: '#6366f1' }} />
          <div>
            <h1 className="page-title">KPI Overview</h1>
            <p className="page-subtitle">Key performance indicators for autonomous driving test campaigns</p>
          </div>
        </div>

        <Space wrap>
          <Select
            value={projectId || undefined}
            onChange={setProjectId}
            placeholder="Select Project"
            style={{ width: 200 }}
            allowClear
            options={projectsData?.map((p: Record<string, unknown>) => ({
              value: p.id as string,
              label: p.name as string,
            }))}
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '6px 12px',
              color: 'var(--text-primary)',
              fontSize: 13,
            }}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '6px 12px',
              color: 'var(--text-primary)',
              fontSize: 13,
            }}
          />
          <Select
            value={interval}
            onChange={(v) => setInterval(v)}
            style={{ width: 110 }}
            options={[
              { value: 'day', label: 'Daily' },
              { value: 'week', label: 'Weekly' },
              { value: 'month', label: 'Monthly' },
            ]}
          />
        </Space>
      </div>

      {/* Panel configuration */}
      <Card className="glass-panel" style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
          Panel Configuration
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>Select which KPI panels to display</p>
        <Space wrap>
          {PANELS.map((panel) => (
            <Checkbox
              key={panel.id}
              checked={enabledPanels[panel.id] ?? false}
              onChange={(e) => setEnabledPanels((prev) => ({ ...prev, [panel.id]: e.target.checked }))}
            >
              {panel.title}
            </Checkbox>
          ))}
        </Space>
      </Card>

      {/* No project selected */}
      {!projectId && (
        <Card className="glass-panel" style={{ textAlign: 'center', padding: '40px 0' }}>
          <TrendingUp size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 16 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Select a project to view KPI metrics</p>
        </Card>
      )}

      {/* KPI panels */}
      {projectId && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {PANELS.filter((p) => enabledPanels[p.id] && (p.type === 'stat' || p.type === 'gauge')).map((panel) => {
              const val = dataMap[panel.metric];
              return (
                <Col xs={24} sm={12} lg={6} key={panel.id}>
                  <Card className="glass-panel glow-accent-hover" style={{ height: '100%' }}>
                    {panel.type === 'stat' ? (
                      <Statistic
                        title={<span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 500 }}>{panel.title}</span>}
                        value={val ?? undefined}
                        precision={1}
                        suffix={<span style={{ fontSize: 16, color: 'var(--text-muted)' }}>{panel.unit}</span>}
                        valueStyle={{ fontFamily: "'Orbitron', 'Exo 2', sans-serif", fontWeight: 700, color: '#e2e8f0' }}
                      />
                    ) : (
                      <>
                        <div style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                          {panel.title}
                        </div>
                        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 32, fontWeight: 700, color: val != null ? gaugeColor(val) : 'var(--text-primary)', marginBottom: 12 }}>
                          {val != null ? val.toFixed(1) : '—'}
                          <span style={{ fontSize: 16, color: 'var(--text-muted)', marginLeft: 4 }}>{panel.unit}</span>
                        </div>
                        <Progress
                          percent={val != null ? Math.min(100, Math.max(0, val)) : 0}
                          showInfo={false}
                          strokeColor={val != null ? gaugeColor(val) : '#6366f1'}
                          size="small"
                        />
                      </>
                    )}
                  </Card>
                </Col>
              );
            })}
          </Row>

          {/* Convergence chart */}
          {enabledPanels['convergence'] && (
            <Card
              className="glass-panel"
              title={<span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600 }}>Issue Convergence</span>}
            >
              {convergencePoints.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={convergencePoints}>
                    <defs>
                      <linearGradient id="openGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="closedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="timestamp"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(v) => new Date(v).toLocaleDateString()}
                      stroke="rgba(255,255,255,0.06)"
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="rgba(255,255,255,0.06)" />
                    <Tooltip
                      labelFormatter={(v) => new Date(v as string).toLocaleDateString()}
                      contentStyle={{
                        background: 'rgba(15,22,42,0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        backdropFilter: 'blur(10px)',
                        color: '#e2e8f0',
                      }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="open" stroke="#f59e0b" fill="url(#openGrad)" name="Open" strokeWidth={2} />
                    <Area type="monotone" dataKey="closed" stroke="#6366f1" fill="url(#closedGrad)" name="Closed" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="No convergence data available" />
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
