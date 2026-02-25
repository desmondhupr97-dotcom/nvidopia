import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Table, Tag, Button, Space, Modal, Steps, Form, Input, InputNumber,
  Slider, Select, Radio, Switch, Row, Col, Popconfirm, message, Segmented, Empty,
} from 'antd';
import { AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { MonitorPlay, Plus, Trash2, Play, Eye, Cpu, Route, BarChart3 } from 'lucide-react';
import {
  getSimulations, createSimulation, deleteSimulation, startSimulation,
  getProjects, getTasks, generateSimFleet, generateSimRoutes,
  type SimulationSession, type SimVehicle, type SimRoute, type VehicleAssignment,
} from '../api/client';
import SimRouteEditor from '../components/simulation/SimRouteEditor';
import SimAssignmentMatrix from '../components/simulation/SimAssignmentMatrix';
import PageHeader from '../components/shared/PageHeader';

const STATUS_PILL: Record<string, { bg: string; text: string }> = {
  Draft:     { bg: '#F3F4F6', text: '#6B7280' },
  Running:   { bg: '#ECFDF5', text: '#059669' },
  Paused:    { bg: '#FEF3C7', text: '#D97706' },
  Completed: { bg: '#E8F0FE', text: '#1A73E8' },
  Aborted:   { bg: '#FEE2E2', text: '#DC2626' },
};

function StatusPill({ status }: { status: string }) {
  const c = STATUS_PILL[status] ?? { bg: '#F3F4F6', text: '#6B7280' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 12px', borderRadius: 9999,
      fontSize: '0.75rem', fontWeight: 600, background: c.bg, color: c.text, lineHeight: '20px',
    }}>
      {status}
    </span>
  );
}

const statusColor: Record<string, string> = {
  Draft: 'default', Running: 'processing', Paused: 'warning', Completed: 'success', Aborted: 'error',
};

export default function SimulationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form] = Form.useForm();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [fleetMode, setFleetMode] = useState<'random' | 'custom'>('random');
  const [routeMode, setRouteMode] = useState<'random' | 'custom'>('random');
  const [useDefaultProject, setUseDefaultProject] = useState(true);
  const [vehicles, setVehicles] = useState<SimVehicle[]>([]);
  const [routes, setRoutes] = useState<SimRoute[]>([]);
  const [assignments, setAssignments] = useState<VehicleAssignment[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['simulations'],
    queryFn: () => getSimulations(),
  });

  const { data: projectsData } = useQuery({ queryKey: ['projects'], queryFn: () => getProjects({}) });
  const { data: tasksData } = useQuery({ queryKey: ['tasks'], queryFn: () => getTasks({}) });

  const [autoStart, setAutoStart] = useState(false);

  const createMut = useMutation({
    mutationFn: (data: Partial<SimulationSession>) => createSimulation(data),
    onSuccess: async (session) => {
      queryClient.invalidateQueries({ queryKey: ['simulations'] });
      setWizardOpen(false);
      resetWizard();
      if (autoStart && session.session_id) {
        try {
          await startSimulation(session.session_id);
          queryClient.invalidateQueries({ queryKey: ['simulations'] });
          message.success('Simulation created & started');
        } catch {
          message.warning('Created but failed to start — start it manually');
        }
      } else {
        message.success('Simulation saved as draft');
      }
      setAutoStart(false);
    },
    onError: (err) => {
      message.error(`Failed to create simulation: ${(err as Error).message}`);
      setAutoStart(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSimulation(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['simulations'] }); message.success('Deleted'); },
  });

  const startMut = useMutation({
    mutationFn: (id: string) => startSimulation(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['simulations'] }); message.success('Simulation started'); },
  });

  const genFleetMut = useMutation({
    mutationFn: (data: { count: number; template?: Partial<SimVehicle> }) => generateSimFleet(data),
    onSuccess: (data) => setVehicles(data.vehicles),
  });

  const genRoutesMut = useMutation({
    mutationFn: (data: { start_point: { lat: number; lng: number }; radius_km?: number; count?: number; min_waypoints?: number; max_waypoints?: number; target_distance_km?: number }) => generateSimRoutes(data),
    onSuccess: (data) => {
      setRoutes(data.routes);
      const roadPlanned = data.routes.some((r: SimRoute) => r.road);
      message.success(`${data.routes.length} route(s) generated${roadPlanned ? ' with road planning' : ''}`);
    },
    onError: (err) => message.error(`Route generation failed: ${(err as Error).message}`),
  });

  function resetWizard() {
    setStep(0); setFleetMode('random'); setRouteMode('random'); setUseDefaultProject(true);
    setVehicles([]); setRoutes([]); setAssignments([]); setSelectedProjects([]); setSelectedTasks([]);
    form.resetFields();
  }

  function handleCreate() {
    const values = form.getFieldsValue(true);
    const session: Partial<SimulationSession> = {
      name: values.name || 'New Simulation',
      fleet_config: {
        mode: fleetMode,
        vehicle_count: values.vehicle_count ?? 5,
        vehicles: fleetMode === 'custom' ? vehicles : undefined,
        vehicle_template: fleetMode === 'random' ? { vehicle_platform: values.platform, soc_architecture: values.soc, sensor_suite_version: values.sensor } : undefined,
      },
      route_config: {
        mode: routeMode,
        routes: routes.length > 0 ? routes.map((r) => ({
          route_id: r.route_id,
          name: r.name,
          waypoints: r.waypoints,
          road: r.road ? { total_distance_m: r.road.total_distance_m, total_duration_s: r.road.total_duration_s, coordinates: r.road.coordinates ?? [], segments: r.road.segments ?? [] } : undefined,
        })) : undefined,
        random_config: routeMode === 'random' ? {
          start_point: { lat: values.start_lat ?? 31.2304, lng: values.start_lng ?? 121.4737 },
          radius_km: values.radius_km ?? 10,
          min_waypoints: values.min_waypoints ?? 5,
          max_waypoints: values.max_waypoints ?? 15,
        } : undefined,
      },
      report_config: {
        telemetry_interval_ms: (values.telemetry_interval ?? 3) * 1000,
        issue_interval_range_ms: [(values.issue_min ?? 30) * 1000, (values.issue_max ?? 120) * 1000],
        status_change_interval_ms: (values.mode_switch ?? 60) * 1000,
        speed_range_mps: [Math.round((values.speed_min ?? 30) / 3.6), Math.round((values.speed_max ?? 120) / 3.6)],
      },
      assignments: useDefaultProject ? [] : assignments,
    };
    createMut.mutate(session);
  }

  const stats = useMemo(() => {
    const all = sessions ?? [];
    return {
      total: all.length,
      running: all.filter((s) => s.status === 'Running').length,
      queued: all.filter((s) => s.status === 'Draft' || s.status === 'Paused').length,
      completed: all.filter((s) => s.status === 'Completed').length,
    };
  }, [sessions]);

  const statCards = [
    { label: 'Total', value: stats.total, color: '#76B900' },
    { label: 'Running', value: stats.running, color: '#34C759' },
    { label: 'Queued / Draft', value: stats.queued, color: '#FF9500' },
    { label: 'Completed', value: stats.completed, color: '#007AFF' },
  ];

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (name: string, r: SimulationSession) => <a onClick={() => navigate(`/simulation/${r.session_id}`)}>{name}</a> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusColor[s] || 'default'}>{s}</Tag> },
    { title: 'Vehicles', key: 'vehicles', render: (_: unknown, r: SimulationSession) => r.fleet_config?.vehicle_count ?? r.fleet_config?.vehicles?.length ?? 0 },
    { title: 'Telemetry Sent', key: 'telemetry', render: (_: unknown, r: SimulationSession) => r.stats?.telemetry_sent ?? 0 },
    { title: 'Issues Sent', key: 'issues', render: (_: unknown, r: SimulationSession) => r.stats?.issues_sent ?? 0 },
    { title: 'Mileage (km)', key: 'mileage', render: (_: unknown, r: SimulationSession) => (r.stats?.total_mileage_km ?? 0).toFixed(1) },
    {
      title: 'Actions', key: 'actions', render: (_: unknown, r: SimulationSession) => (
        <Space size="small">
          <Button size="small" icon={<Eye size={12} />} onClick={() => navigate(`/simulation/${r.session_id}`)} />
          {r.status === 'Draft' && <Button size="small" type="primary" icon={<Play size={12} />} onClick={() => startMut.mutate(r.session_id)} />}
          <Popconfirm title="Delete simulation?" onConfirm={() => deleteMut.mutate(r.session_id)}>
            <Button size="small" danger icon={<Trash2 size={12} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredTasks = tasksData?.filter((t) => selectedProjects.includes(t.projectId)) ?? [];

  function SimCard({ session }: { session: SimulationSession }) {
    const vCount = session.fleet_config?.vehicle_count ?? session.fleet_config?.vehicles?.length ?? 0;
    const routeMode = session.route_config?.mode ?? 'random';
    return (
      <div className="ios-card ios-card-interactive" style={{ padding: 20, height: '100%', cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => navigate(`/simulation/${session.session_id}`)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, flex: 1, marginRight: 8 }}>
            {session.name}
          </h3>
          <StatusPill status={session.status} />
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.8, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cpu size={13} style={{ color: 'var(--text-muted)' }} />
            <span>{vCount} vehicle{vCount !== 1 ? 's' : ''} ({session.fleet_config?.mode})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Route size={13} style={{ color: 'var(--text-muted)' }} />
            <span>Routes: {routeMode}{session.route_config?.routes ? ` (${session.route_config.routes.length})` : ''}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarChart3 size={13} style={{ color: 'var(--text-muted)' }} />
            <span>{(session.stats?.total_mileage_km ?? 0).toFixed(1)} km driven</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14, flexWrap: 'wrap' }}>
          <span>Telemetry: {session.stats?.telemetry_sent ?? 0}</span>
          <span>Issues: {session.stats?.issues_sent ?? 0}</span>
        </div>

        <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--border-secondary)', paddingTop: 12 }} onClick={(e) => e.stopPropagation()}>
          <Button size="small" icon={<Eye size={12} />} onClick={() => navigate(`/simulation/${session.session_id}`)}>View</Button>
          {session.status === 'Draft' && (
            <Button size="small" type="primary" icon={<Play size={12} />} onClick={() => startMut.mutate(session.session_id)}>Start</Button>
          )}
          <Popconfirm title="Delete simulation?" onConfirm={() => deleteMut.mutate(session.session_id)}>
            <Button size="small" danger icon={<Trash2 size={12} />} />
          </Popconfirm>
        </div>
      </div>
    );
  }

  const wizardSteps = [
    {
      title: 'Fleet',
      content: (
        <div>
          <Form.Item label="Simulation Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="My Fleet Simulation" />
          </Form.Item>
          <Form.Item label="Fleet Mode">
            <Radio.Group value={fleetMode} onChange={(e) => setFleetMode(e.target.value)}>
              <Radio.Button value="random">Random</Radio.Button>
              <Radio.Button value="custom">Custom</Radio.Button>
            </Radio.Group>
          </Form.Item>
          {fleetMode === 'random' ? (
            <>
              <Form.Item label="Vehicle Count" name="vehicle_count" initialValue={5}>
                <Slider min={1} max={100} />
              </Form.Item>
              <Row gutter={16}>
                <Col span={8}><Form.Item label="Platform" name="platform"><Input placeholder="ORIN-X" /></Form.Item></Col>
                <Col span={8}><Form.Item label="SoC" name="soc"><Input placeholder="Orin-SoC-A" /></Form.Item></Col>
                <Col span={8}><Form.Item label="Sensor Suite" name="sensor"><Input placeholder="LiDAR-v4" /></Form.Item></Col>
              </Row>
              <Button onClick={() => genFleetMut.mutate({ count: form.getFieldValue('vehicle_count') ?? 5, template: { vehicle_platform: form.getFieldValue('platform'), soc_architecture: form.getFieldValue('soc'), sensor_suite_version: form.getFieldValue('sensor') } })} loading={genFleetMut.isPending}>
                Preview Fleet
              </Button>
              {vehicles.length > 0 && <Table size="small" dataSource={vehicles} rowKey="vin" columns={[{ title: 'VIN', dataIndex: 'vin' }, { title: 'Platform', dataIndex: 'vehicle_platform' }, { title: 'Model', dataIndex: 'model_code' }]} pagination={false} style={{ marginTop: 12 }} />}
            </>
          ) : (
            <Table
              size="small"
              dataSource={vehicles}
              rowKey="vin"
              columns={[
                { title: 'VIN', dataIndex: 'vin', render: (v: string, _r: SimVehicle, idx: number) => <Input size="small" value={v} onChange={(e) => { const copy = [...vehicles]; copy[idx] = { ...copy[idx]!, vin: e.target.value }; setVehicles(copy); }} /> },
                { title: 'Platform', dataIndex: 'vehicle_platform', render: (v: string, _r: SimVehicle, idx: number) => <Input size="small" value={v} onChange={(e) => { const copy = [...vehicles]; copy[idx] = { ...copy[idx]!, vehicle_platform: e.target.value }; setVehicles(copy); }} /> },
                { title: 'Model', dataIndex: 'model_code', render: (v: string, _r: SimVehicle, idx: number) => <Input size="small" value={v} onChange={(e) => { const copy = [...vehicles]; copy[idx] = { ...copy[idx]!, model_code: e.target.value }; setVehicles(copy); }} /> },
              ]}
              pagination={false}
              footer={() => <Button size="small" onClick={() => setVehicles([...vehicles, { vin: `SIM-${Date.now().toString(36)}`, plate_type: 'temporary', model_code: 'AD-SUV-01', vehicle_platform: 'ORIN-X', sensor_suite_version: 'LiDAR-v4', soc_architecture: 'Orin-SoC-A' }])}>Add Vehicle</Button>}
            />
          )}
        </div>
      ),
    },
    {
      title: 'Project/Task',
      content: (
        <div>
          <Form.Item label="Use Default Project">
            <Switch checked={useDefaultProject} onChange={setUseDefaultProject} />
            <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: 12 }}>Auto-create a simulation-specific project and task</span>
          </Form.Item>
          {!useDefaultProject && (
            <>
              <Form.Item label="Select Projects">
                <Select mode="multiple" value={selectedProjects} onChange={setSelectedProjects} placeholder="Select projects" options={projectsData?.map((p) => ({ value: p.id, label: p.name })) ?? []} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Select Tasks">
                <Select mode="multiple" value={selectedTasks} onChange={setSelectedTasks} placeholder="Select tasks" options={filteredTasks.map((t) => ({ value: t.id, label: `${t.title} (${t.taskType ?? t.stage})` })) ?? []} style={{ width: '100%' }} />
              </Form.Item>
              {vehicles.length > 0 && selectedTasks.length > 0 && (
                <SimAssignmentMatrix
                  vehicles={vehicles}
                  projects={projectsData?.filter((p) => selectedProjects.includes(p.id)) ?? []}
                  tasks={filteredTasks.filter((t) => selectedTasks.includes(t.id))}
                  assignments={assignments}
                  onChange={setAssignments}
                />
              )}
            </>
          )}
        </div>
      ),
    },
    {
      title: 'Routes',
      content: (
        <div>
          <Form.Item label="Route Mode">
            <Radio.Group value={routeMode} onChange={(e) => setRouteMode(e.target.value)}>
              <Radio.Button value="random">Random</Radio.Button>
              <Radio.Button value="custom">Custom</Radio.Button>
            </Radio.Group>
          </Form.Item>
          {routeMode === 'random' ? (
            <>
              <Row gutter={16}>
                <Col span={6}><Form.Item label="Start Lat" name="start_lat" initialValue={31.2304}><InputNumber style={{ width: '100%' }} step={0.001} /></Form.Item></Col>
                <Col span={6}><Form.Item label="Start Lng" name="start_lng" initialValue={121.4737}><InputNumber style={{ width: '100%' }} step={0.001} /></Form.Item></Col>
                <Col span={6}><Form.Item label="Target Distance (km)" name="target_distance_km" initialValue={500} tooltip="Total road distance target. Set 0 to use radius mode."><InputNumber min={0} max={2000} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={6}><Form.Item label="Radius (km)" name="radius_km" initialValue={10} tooltip="Only used when Target Distance is 0"><InputNumber min={1} max={500} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}><Form.Item label="Min Waypoints" name="min_waypoints" initialValue={3}><InputNumber min={2} max={10} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={12}><Form.Item label="Max Waypoints" name="max_waypoints" initialValue={8}><InputNumber min={2} max={10} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Button onClick={() => genRoutesMut.mutate({ start_point: { lat: form.getFieldValue('start_lat') ?? 31.2304, lng: form.getFieldValue('start_lng') ?? 121.4737 }, radius_km: form.getFieldValue('radius_km') ?? 10, count: vehicles.length || form.getFieldValue('vehicle_count') || 5, min_waypoints: form.getFieldValue('min_waypoints') ?? 3, max_waypoints: form.getFieldValue('max_waypoints') ?? 8, target_distance_km: form.getFieldValue('target_distance_km') ?? 500 })} loading={genRoutesMut.isPending}>
                Generate Routes
              </Button>
            </>
          ) : null}
          <SimRouteEditor
            routes={routes}
            onChange={setRoutes}
            mode={routeMode}
            startPoint={routeMode === 'random' ? { lat: form.getFieldValue('start_lat') ?? 31.2304, lng: form.getFieldValue('start_lng') ?? 121.4737 } : undefined}
          />
        </div>
      ),
    },
    {
      title: 'Reporting',
      content: (
        <div>
          <Form.Item label="Telemetry Interval (seconds)" name="telemetry_interval" initialValue={3}>
            <Slider min={1} max={30} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="Issue Min Interval (sec)" name="issue_min" initialValue={30}><InputNumber min={5} max={600} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item label="Issue Max Interval (sec)" name="issue_max" initialValue={120}><InputNumber min={10} max={600} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item label="Driving Mode Switch Interval (sec)" name="mode_switch" initialValue={60}>
            <Slider min={10} max={300} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="Min Speed (km/h)" name="speed_min" initialValue={30}><InputNumber min={5} max={200} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item label="Max Speed (km/h)" name="speed_max" initialValue={120}><InputNumber min={10} max={200} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
        </div>
      ),
    },
    {
      title: 'Review',
      content: (
        <div>
          <div className="ios-card" style={{ padding: 20, marginBottom: 16 }}>
            <Row gutter={[16, 8]}>
              <Col span={12}><strong>Name:</strong> {form.getFieldValue('name') || 'New Simulation'}</Col>
              <Col span={12}><strong>Fleet:</strong> {fleetMode === 'random' ? `${form.getFieldValue('vehicle_count') ?? 5} random vehicles` : `${vehicles.length} custom vehicles`}</Col>
              <Col span={12}><strong>Routes:</strong> {routeMode === 'random' ? 'Auto-generated' : `${routes.length} custom routes`}</Col>
              <Col span={12}><strong>Project:</strong> {useDefaultProject ? 'Auto-create' : `${selectedProjects.length} selected`}</Col>
              <Col span={12}><strong>Telemetry:</strong> every {form.getFieldValue('telemetry_interval') ?? 3}s</Col>
              <Col span={12}><strong>Speed:</strong> {form.getFieldValue('speed_min') ?? 30} - {form.getFieldValue('speed_max') ?? 120} km/h</Col>
            </Row>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Fleet Simulation"
        subtitle="Simulate vehicle fleets for demo and stress testing"
        action={
          <Button className="btn-primary-green" icon={<Plus size={14} />} size="large" onClick={() => { resetWizard(); setWizardOpen(true); }}>
            New Simulation
          </Button>
        }
      />

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {statCards.map((s) => (
          <div className="stat-card" key={s.label}>
            <span className="stat-card-label">{s.label}</span>
            <span className="stat-card-value" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16 }}>
        <Segmented
          value={viewMode}
          onChange={(v) => setViewMode(v as 'grid' | 'list')}
          options={[
            { value: 'grid', icon: <AppstoreOutlined /> },
            { value: 'list', icon: <UnorderedListOutlined /> },
          ]}
        />
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        (!sessions || sessions.length === 0) && !isLoading ? (
          <div className="ios-card" style={{ padding: 48, textAlign: 'center' }}>
            <Empty
              image={<MonitorPlay size={48} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />}
              description={<span style={{ color: 'var(--text-muted)' }}>No simulations yet. Create your first simulation to get started.</span>}
            />
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {(sessions ?? []).map((session) => (
              <Col xs={24} sm={12} lg={8} key={session.session_id}>
                <SimCard session={session} />
              </Col>
            ))}
          </Row>
        )
      ) : (
        <div className="ios-card" style={{ overflow: 'hidden' }}>
          <Table
            dataSource={sessions ?? []}
            columns={columns}
            rowKey="session_id"
            loading={isLoading}
            pagination={{ pageSize: 10 }}
            size="middle"
          />
        </div>
      )}

      <Modal
        open={wizardOpen}
        onCancel={() => setWizardOpen(false)}
        width={900}
        title="Create Simulation"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button disabled={step === 0} onClick={() => setStep(step - 1)}>Previous</Button>
            <Space>
              {step < wizardSteps.length - 1 && <Button type="primary" onClick={() => setStep(step + 1)}>Next</Button>}
              {step === wizardSteps.length - 1 && (
                <>
                  <Button onClick={() => { setAutoStart(false); handleCreate(); }} loading={createMut.isPending && !autoStart}>Save as Draft</Button>
                  <Button type="primary" onClick={() => { setAutoStart(true); handleCreate(); }} loading={createMut.isPending && autoStart}>Create & Start</Button>
                </>
              )}
            </Space>
          </div>
        }
        destroyOnClose
      >
        <Steps current={step} items={wizardSteps.map((s) => ({ title: s.title }))} style={{ marginBottom: 24 }} size="small" />
        <Form form={form} layout="vertical">
          {wizardSteps[step]?.content}
        </Form>
      </Modal>
    </div>
  );
}
