import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Statistic, Progress, Select, Space, Row, Col, Empty, DatePicker, Button, Popconfirm, Switch, Collapse, Tag } from 'antd';
import { BarChart3, TrendingUp, Plus, Trash2, Edit3, Upload } from 'lucide-react';
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
import KpiJsonUpload from '../components/kpi/KpiJsonUpload';
import VChartRenderer from '../components/kpi/VChartRenderer';

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  border: 'none',
  padding: 20,
};

function gaugeColor(pct: number): string {
  if (pct >= 80) return '#34C759';
  if (pct >= 50) return '#FF9500';
  return '#FF3B30';
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
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16,
      marginBottom: 24,
    }}>
      {stats.map((s) => (
        <div key={s.title} className="ios-card" style={cardStyle}>
          <Statistic
            title={<span style={{ fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8E8E93' }}>{s.title}</span>}
            value={s.value != null ? Number(s.value) : undefined}
            precision={1}
            suffix={<span style={{ fontSize: 12, color: '#8E8E93' }}>{s.unit}</span>}
            valueStyle={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: '#76B900' }}
          />
        </div>
      ))}

      {gauges.map((g) => {
        const val = g.value != null ? Number(g.value) : null;
        return (
          <div key={g.title} className="ios-card" style={cardStyle}>
            <div style={{ fontWeight: 600, fontSize: 11, color: '#8E8E93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{g.title}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: val != null ? gaugeColor(val) : '#1C1C1E', marginBottom: 8 }}>
              {val != null ? val.toFixed(1) : '\u2014'}
              <span style={{ fontSize: 12, color: '#8E8E93', marginLeft: 4 }}>{g.unit}</span>
            </div>
            <Progress percent={val != null ? Math.min(100, Math.max(0, val)) : 0} showInfo={false} strokeColor={val != null ? gaugeColor(val) : '#34C759'} size="small" />
          </div>
        );
      })}

      <div className="ios-card" style={{ ...cardStyle, gridColumn: 'span 2', minHeight: 340 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#1C1C1E', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issue Convergence</div>
        {convergencePoints.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={convergencePoints}>
              <defs>
                <linearGradient id="openGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF3B30" stopOpacity={0.15} /><stop offset="100%" stopColor="#FF3B30" stopOpacity={0} /></linearGradient>
                <linearGradient id="closedGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#76B900" stopOpacity={0.15} /><stop offset="100%" stopColor="#76B900" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: '#8E8E93' }} tickFormatter={(v) => new Date(v).toLocaleDateString()} stroke="rgba(0,0,0,0.06)" />
              <YAxis tick={{ fontSize: 10, fill: '#8E8E93' }} stroke="rgba(0,0,0,0.06)" />
              <Tooltip labelFormatter={(v) => new Date(v as string).toLocaleDateString()} contentStyle={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, color: '#1C1C1E', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Legend />
              <Area type="monotone" dataKey="open" stroke="#FF3B30" fill="url(#openGrad)" name="Open" strokeWidth={2} />
              <Area type="monotone" dataKey="closed" stroke="#76B900" fill="url(#closedGrad)" name="Closed" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Empty description="No convergence data available" />
        )}
      </div>
    </div>
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

  const isVChart = def.renderer === 'vchart' && def.vchart_spec;
  const chartType = def.visualization?.chart_type ?? 'stat';

  if (isVChart && def.vchart_spec) {
    const chartData = data?.groups
      ? data.groups.map((g) => ({ ...g.group, value: g.value }))
      : data?.value != null
        ? [{ value: data.value }]
        : [];

    return (
      <VChartRenderer
        spec={def.vchart_spec}
        data={chartData}
        title={def.name}
        loading={isLoading}
      />
    );
  }

  if (chartType === 'stat') {
    return <KpiStatCard title={def.name} value={data?.value ?? null} loading={isLoading} />;
  }

  if (chartType === 'table' && data?.groups) {
    return (
      <Card className="ios-card" style={cardStyle} title={<span style={{ fontWeight: 600, color: '#1C1C1E' }}>{def.name}</span>}>
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

    const thresholds = (def.visualization as any)?.thresholds;
    return (
      <Card className="ios-card" style={cardStyle} title={<span style={{ fontWeight: 600, color: '#1C1C1E' }}>{def.name}</span>}>
        <KpiChartRenderer chartType={chartType} data={chartData} xField={xField} yFields={yFields} thresholds={thresholds} />
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
  const [importOpen, setImportOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<KpiDefinition | undefined>();

  const { data: projectsData } = useQuery({ queryKey: ['projects'], queryFn: () => getProjects({}) });
  const { data: customDefs } = useQuery({ queryKey: ['kpi-definitions'], queryFn: getKpiDefinitions });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteKpiDefinition(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpi-definitions'] }),
  });

  const grouped = useMemo(() => {
    if (!customDefs) return new Map<string, KpiDefinition[]>();
    const map = new Map<string, KpiDefinition[]>();
    for (const def of customDefs.filter((d) => d.enabled)) {
      const key = def.dashboard_id ?? '__ungrouped__';
      const arr = map.get(key) ?? [];
      arr.push(def);
      map.set(key, arr);
    }
    return map;
  }, [customDefs]);

  return (
    <div style={{ background: '#F5F5F7', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BarChart3 size={24} style={{ color: '#76B900' }} />
          <div>
            <h1 className="page-title" style={{ margin: 0, color: '#1C1C1E' }}>KPI Overview</h1>
            <p style={{ margin: 0, color: '#8E8E93', fontSize: 13 }}>Key performance indicators for autonomous driving test campaigns</p>
          </div>
        </div>
        <Space wrap>
          <Select value={projectId || undefined} onChange={setProjectId} placeholder="Select Project" style={{ width: 200 }} allowClear options={projectsData?.map((p) => ({ value: p.id, label: p.name }))} />
          <DatePicker placeholder="Start date" onChange={(_d, ds) => setStartDate(typeof ds === 'string' ? ds : '')} style={{ width: 140 }} />
          <DatePicker placeholder="End date" onChange={(_d, ds) => setEndDate(typeof ds === 'string' ? ds : '')} style={{ width: 140 }} />
          <Select value={interval} onChange={(v) => setInterval(v)} style={{ width: 110 }} options={[{ value: 'day', label: 'Daily' }, { value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }]} />
        </Space>
      </div>

      <div className="ios-card" style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1C1C1E' }}>Panel Configuration</div>
            <Space>
              <span style={{ color: '#8E8E93', fontSize: 12 }}>Built-in metrics</span>
              <Switch size="small" checked={showBuiltin} onChange={setShowBuiltin} />
            </Space>
          </div>
          <Space>
            <Button
              icon={<Upload size={14} />}
              onClick={() => setImportOpen(true)}
              style={{ borderColor: '#E5E5EA', color: '#76B900', borderRadius: 8 }}
            >
              Import JSON
            </Button>
            <Button type="primary" icon={<Plus size={14} />} onClick={() => { setEditingDef(undefined); setModalOpen(true); }} style={{ background: '#76B900', borderColor: '#76B900', borderRadius: 8 }}>
              Add Custom KPI
            </Button>
          </Space>
        </div>
      </div>

      {!projectId && (
        <div className="ios-card" style={{ ...cardStyle, textAlign: 'center', padding: '48px 20px' }}>
          <TrendingUp size={48} style={{ color: '#C7C7CC', marginBottom: 16 }} />
          <p style={{ color: '#8E8E93', fontSize: 14, margin: 0 }}>Select a project to view KPI metrics</p>
        </div>
      )}

      {projectId && (
        <>
          {showBuiltin && <BuiltinPanels projectId={projectId} startDate={startDate} endDate={endDate} interval={interval} />}

          {grouped.size > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#1C1C1E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Custom KPIs
              </div>

              {Array.from(grouped.entries()).map(([dashId, defs]) => {
                const dashName = defs[0]?.dashboard_name;
                const isGrouped = dashId !== '__ungrouped__';

                const kpiCards = (
                  <Row gutter={[16, 16]}>
                    {defs.map((def) => {
                      const isWide = def.renderer === 'vchart' || (def.visualization?.chart_type !== 'stat');
                      return (
                        <Col xs={24} md={isWide ? 24 : 8} key={def.kpi_id}>
                          <div style={{ position: 'relative' }}>
                            <CustomKpiPanel def={def} projectId={projectId} />
                            <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                              <Button size="small" type="text" icon={<Edit3 size={12} />} onClick={() => { setEditingDef(def); setModalOpen(true); }} style={{ color: '#8E8E93' }} />
                              <Popconfirm title="Delete this KPI?" onConfirm={() => deleteMut.mutate(def.kpi_id)} okText="Delete" cancelText="Cancel">
                                <Button size="small" type="text" danger icon={<Trash2 size={12} />} />
                              </Popconfirm>
                            </div>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                );

                if (isGrouped) {
                  return (
                    <Collapse
                      key={dashId}
                      ghost
                      defaultActiveKey={[dashId]}
                      style={{ marginBottom: 16 }}
                      items={[{
                        key: dashId,
                        label: (
                          <Space>
                            <span style={{ color: '#1C1C1E', fontWeight: 600 }}>{dashName ?? dashId}</span>
                            <Tag color="cyan">{defs.length} KPIs</Tag>
                            {defs.some((d) => d.renderer === 'vchart') && <Tag color="magenta">VChart</Tag>}
                          </Space>
                        ),
                        children: kpiCards,
                      }]}
                    />
                  );
                }

                return <div key={dashId}>{kpiCards}</div>;
              })}
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

      <KpiJsonUpload
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => queryClient.invalidateQueries({ queryKey: ['kpi-definitions'] })}
      />
    </div>
  );
}
