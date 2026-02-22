import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Statistic, Progress, Select, Space, Row, Col, Empty, DatePicker, Button, Popconfirm, Switch } from 'antd';
import { BarChart3, TrendingUp, Plus, Trash2, Edit3 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  getMpi, getMttr, getRegressionPassRate, getFleetUtilization, getIssueConvergence, getProjects,
  getKpiDefinitions, evaluateKpi, deleteKpiDefinition,
  type KpiDefinition,
} from '../api/client';
import KpiChartRenderer from '../components/kpi/KpiChartRenderer';
import KpiStatCard from '../components/kpi/KpiStatCard';
import KpiTableRenderer from '../components/kpi/KpiTableRenderer';
import KpiDefinitionModal from '../components/kpi/KpiDefinitionModal';

function gaugeColor(pct: number): string {
  if (pct >= 80) return '#22c55e';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

function BuiltinPanels({ projectId, startDate, endDate, interval }: {
  projectId: string; startDate: string; endDate: string; interval: string;
}) {
  const qp = { project_id: projectId, start_date: startDate || undefined, end_date: endDate || undefined };

  const { data: mpiData } = useQuery({ queryKey: ['kpi-mpi', projectId, startDate, endDate], queryFn: () => getMpi(qp), enabled: !!projectId });
  const { data: mttrData } = useQuery({ queryKey: ['kpi-mttr', projectId, startDate, endDate], queryFn: () => getMttr(qp), enabled: !!projectId });
  const { data: rprData } = useQuery({ queryKey: ['kpi-rpr', projectId], queryFn: () => getRegressionPassRate({ project_id: projectId }), enabled: !!projectId });
  const { data: fleetData } = useQuery({ queryKey: ['kpi-fleet', projectId, startDate, endDate], queryFn: () => getFleetUtilization(qp), enabled: !!projectId });
  const { data: convergenceData } = useQuery({ queryKey: ['kpi-convergence', projectId, startDate, endDate, interval], queryFn: () => getIssueConvergence({ ...qp, interval }), enabled: !!projectId });

  const convergencePoints = useMemo(() =>
    convergenceData?.points?.map((p: Record<string, unknown>) => ({
      timestamp: p.timestamp as string,
      open: Number((p.dimensions as Record<string, unknown> | undefined)?.open_count ?? p.value ?? 0),
      closed: Number((p.dimensions as Record<string, unknown> | undefined)?.closed_count ?? 0),
    })) ?? []
  , [convergenceData]);

  const stats = [
    { title: 'Miles Per Intervention', value: mpiData?.value, unit: 'km' },
    { title: 'Mean Time To Resolution', value: mttrData?.value, unit: 'hours' },
  ];
  const gauges = [
    { title: 'Regression Pass Rate', value: rprData?.value, unit: '%' },
    { title: 'Fleet Utilization', value: fleetData?.value, unit: '%' },
  ];

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {stats.map((s) => (
          <Col xs={24} sm={12} lg={6} key={s.title}>
            <Card className="glass-panel glow-accent-hover" style={{ height: '100%' }}>
              <Statistic
                title={<span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 500 }}>{s.title}</span>}
                value={s.value != null ? Number(s.value) : undefined}
                precision={1}
                suffix={<span style={{ fontSize: 16, color: 'var(--text-muted)' }}>{s.unit}</span>}
                valueStyle={{ fontFamily: "'Orbitron', 'Exo 2', sans-serif", fontWeight: 700, color: '#e2e8f0' }}
              />
            </Card>
          </Col>
        ))}
        {gauges.map((g) => {
          const val = g.value != null ? Number(g.value) : null;
          return (
            <Col xs={24} sm={12} lg={6} key={g.title}>
              <Card className="glass-panel glow-accent-hover" style={{ height: '100%' }}>
                <div style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{g.title}</div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 32, fontWeight: 700, color: val != null ? gaugeColor(val) : 'var(--text-primary)', marginBottom: 12 }}>
                  {val != null ? val.toFixed(1) : '—'}
                  <span style={{ fontSize: 16, color: 'var(--text-muted)', marginLeft: 4 }}>{g.unit}</span>
                </div>
                <Progress percent={val != null ? Math.min(100, Math.max(0, val)) : 0} showInfo={false} strokeColor={val != null ? gaugeColor(val) : '#6366f1'} size="small" />
              </Card>
            </Col>
          );
        })}
      </Row>
      <Card className="glass-panel" title={<span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600 }}>Issue Convergence</span>}>
        {convergencePoints.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={convergencePoints}>
              <defs>
                <linearGradient id="openGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                <linearGradient id="closedGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => new Date(v).toLocaleDateString()} stroke="rgba(255,255,255,0.06)" />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="rgba(255,255,255,0.06)" />
              <Tooltip labelFormatter={(v) => new Date(v as string).toLocaleDateString()} contentStyle={{ background: 'rgba(15,22,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, backdropFilter: 'blur(10px)', color: '#e2e8f0' }} />
              <Legend />
              <Area type="monotone" dataKey="open" stroke="#f59e0b" fill="url(#openGrad)" name="Open" strokeWidth={2} />
              <Area type="monotone" dataKey="closed" stroke="#6366f1" fill="url(#closedGrad)" name="Closed" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Empty description="No convergence data available" />
        )}
      </Card>
    </>
  );
}

function CustomKpiPanel({ def, projectId }: { def: KpiDefinition; projectId: string }) {
  const params: Record<string, string | undefined> = {};
  if (projectId) params.project_id = projectId;

  const { data, isLoading } = useQuery({
    queryKey: ['kpi-custom', def.kpi_id, projectId],
    queryFn: () => evaluateKpi(def.kpi_id, params),
    enabled: def.enabled,
  });

  const chartType = def.visualization?.chart_type ?? 'stat';

  if (chartType === 'stat') {
    return <KpiStatCard title={def.name} value={data?.value ?? null} loading={isLoading} />;
  }

  if (chartType === 'table' && data?.groups) {
    return (
      <Card className="glass-panel" title={<span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600 }}>{def.name}</span>}>
        <KpiTableRenderer groups={data.groups} />
      </Card>
    );
  }

  if (data?.groups && data.groups.length > 0) {
    const chartData = data.groups.map((g) => ({ ...g.group, value: g.value }));
    const xField = def.visualization?.x_axis?.field ?? Object.keys(data.groups[0]?.group ?? {})[0] ?? 'group';
    const yFields = def.visualization?.y_axes?.map((y) => ({
      key: y.variable ?? 'value',
      label: y.label,
      color: y.color,
      axisId: y.axis_id,
    })) ?? [{ key: 'value', label: def.name }];

    return (
      <Card className="glass-panel" title={<span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600 }}>{def.name}</span>}>
        <KpiChartRenderer chartType={chartType} data={chartData} xField={xField} yFields={yFields} />
      </Card>
    );
  }

  return <KpiStatCard title={def.name} value={data?.value ?? null} loading={isLoading} />;
}

export default function KpiDashboardPage() {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [interval, setInterval] = useState<'day' | 'week' | 'month'>('day');
  const [showBuiltin, setShowBuiltin] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<KpiDefinition | undefined>();

  const { data: projectsData } = useQuery({ queryKey: ['projects'], queryFn: () => getProjects({}) });
  const { data: customDefs } = useQuery({ queryKey: ['kpi-definitions'], queryFn: getKpiDefinitions });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteKpiDefinition(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpi-definitions'] }),
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BarChart3 size={28} style={{ color: '#6366f1' }} />
          <div>
            <h1 className="page-title">KPI Overview</h1>
            <p className="page-subtitle">Key performance indicators for autonomous driving test campaigns</p>
          </div>
        </div>
        <Space wrap>
          <Select value={projectId || undefined} onChange={setProjectId} placeholder="Select Project" style={{ width: 200 }} allowClear options={projectsData?.map((p) => ({ value: p.id, label: p.name }))} />
          <DatePicker placeholder="Start date" onChange={(_d, ds) => setStartDate(typeof ds === 'string' ? ds : '')} style={{ width: 140 }} />
          <DatePicker placeholder="End date" onChange={(_d, ds) => setEndDate(typeof ds === 'string' ? ds : '')} style={{ width: 140 }} />
          <Select value={interval} onChange={(v) => setInterval(v)} style={{ width: 110 }} options={[{ value: 'day', label: 'Daily' }, { value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }]} />
        </Space>
      </div>

      <Card className="glass-panel" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Panel Configuration</div>
            <Space>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Built-in metrics</span>
              <Switch size="small" checked={showBuiltin} onChange={setShowBuiltin} />
            </Space>
          </div>
          <Button type="primary" icon={<Plus size={14} />} onClick={() => { setEditingDef(undefined); setModalOpen(true); }}>
            Add Custom KPI
          </Button>
        </div>
      </Card>

      {!projectId && (
        <Card className="glass-panel" style={{ textAlign: 'center', padding: '40px 0' }}>
          <TrendingUp size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 16 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Select a project to view KPI metrics</p>
        </Card>
      )}

      {projectId && (
        <>
          {showBuiltin && <BuiltinPanels projectId={projectId} startDate={startDate} endDate={endDate} interval={interval} />}

          {customDefs && customDefs.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 16, color: '#e2e8f0' }}>
                Custom KPIs
              </div>
              <Row gutter={[16, 16]}>
                {customDefs.filter((d) => d.enabled).map((def) => (
                  <Col xs={24} md={def.visualization?.chart_type === 'stat' ? 8 : 24} key={def.kpi_id}>
                    <div style={{ position: 'relative' }}>
                      <CustomKpiPanel def={def} projectId={projectId} />
                      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                        <Button size="small" type="text" icon={<Edit3 size={12} />} onClick={() => { setEditingDef(def); setModalOpen(true); }} style={{ color: 'var(--text-muted)' }} />
                        <Popconfirm title="Delete this KPI?" onConfirm={() => deleteMut.mutate(def.kpi_id)} okText="Delete" cancelText="Cancel">
                          <Button size="small" type="text" danger icon={<Trash2 size={12} />} />
                        </Popconfirm>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </>
      )}

      <KpiDefinitionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingDef(undefined); }}
        onSaved={() => { queryClient.invalidateQueries({ queryKey: ['kpi-definitions'] }); setModalOpen(false); setEditingDef(undefined); }}
        editingDef={editingDef}
      />
    </div>
  );
}
