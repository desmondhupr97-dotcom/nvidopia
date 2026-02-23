import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Tag, Button, Space, Modal, Steps, Form, Input, InputNumber, Slider, Select, Radio, Switch, Row, Col, Popconfirm, message } from 'antd';
import { MonitorPlay, Plus, Trash2, Play, Eye } from 'lucide-react';
import {
  getSimulations, createSimulation, deleteSimulation, startSimulation,
  getProjects, getTasks, generateSimFleet, generateSimRoutes,
  type SimulationSession, type SimVehicle, type SimRoute, type VehicleAssignment,
} from '../api/client';
import SimRouteEditor from '../components/simulation/SimRouteEditor';
import SimAssignmentMatrix from '../components/simulation/SimAssignmentMatrix';

const statusColor: Record<string, string> = {
  Draft: 'default', Running: 'processing', Paused: 'warning', Completed: 'success', Aborted: 'error',
};

export default function SimulationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form] = Form.useForm();

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

  const createMut = useMutation({
    mutationFn: (data: Partial<SimulationSession>) => createSimulation(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['simulations'] }); setWizardOpen(false); resetWizard(); message.success('Simulation created'); },
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
    mutationFn: (data: { start_point: { lat: number; lng: number }; radius_km?: number; count?: number; min_waypoints?: number; max_waypoints?: number }) => generateSimRoutes(data),
    onSuccess: (data) => setRoutes(data.routes),
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
        routes: routes.length > 0 ? routes : undefined,
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
                <Col span={8}><Form.Item label="Start Lat" name="start_lat" initialValue={31.2304}><InputNumber style={{ width: '100%' }} step={0.001} /></Form.Item></Col>
                <Col span={8}><Form.Item label="Start Lng" name="start_lng" initialValue={121.4737}><InputNumber style={{ width: '100%' }} step={0.001} /></Form.Item></Col>
                <Col span={8}><Form.Item label="Radius (km)" name="radius_km" initialValue={10}><InputNumber min={1} max={50} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}><Form.Item label="Min Waypoints" name="min_waypoints" initialValue={5}><InputNumber min={2} max={50} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={12}><Form.Item label="Max Waypoints" name="max_waypoints" initialValue={15}><InputNumber min={2} max={50} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Button onClick={() => genRoutesMut.mutate({ start_point: { lat: form.getFieldValue('start_lat') ?? 31.2304, lng: form.getFieldValue('start_lng') ?? 121.4737 }, radius_km: form.getFieldValue('radius_km') ?? 10, count: vehicles.length || form.getFieldValue('vehicle_count') || 5, min_waypoints: form.getFieldValue('min_waypoints') ?? 5, max_waypoints: form.getFieldValue('max_waypoints') ?? 15 })} loading={genRoutesMut.isPending}>
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
          <Card className="glass-panel" style={{ marginBottom: 16 }}>
            <Row gutter={[16, 8]}>
              <Col span={12}><strong>Name:</strong> {form.getFieldValue('name') || 'New Simulation'}</Col>
              <Col span={12}><strong>Fleet:</strong> {fleetMode === 'random' ? `${form.getFieldValue('vehicle_count') ?? 5} random vehicles` : `${vehicles.length} custom vehicles`}</Col>
              <Col span={12}><strong>Routes:</strong> {routeMode === 'random' ? 'Auto-generated' : `${routes.length} custom routes`}</Col>
              <Col span={12}><strong>Project:</strong> {useDefaultProject ? 'Auto-create' : `${selectedProjects.length} selected`}</Col>
              <Col span={12}><strong>Telemetry:</strong> every {form.getFieldValue('telemetry_interval') ?? 3}s</Col>
              <Col span={12}><strong>Speed:</strong> {form.getFieldValue('speed_min') ?? 30} - {form.getFieldValue('speed_max') ?? 120} km/h</Col>
            </Row>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <MonitorPlay size={28} style={{ color: '#22c55e' }} />
          <div>
            <h1 className="page-title">Fleet Simulation</h1>
            <p className="page-subtitle">Simulate vehicle fleets for demo and stress testing</p>
          </div>
        </div>
        <Button type="primary" icon={<Plus size={14} />} onClick={() => { resetWizard(); setWizardOpen(true); }}>
          New Simulation
        </Button>
      </div>

      <Card className="glass-panel">
        <Table
          dataSource={sessions ?? []}
          columns={columns}
          rowKey="session_id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      </Card>

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
                  <Button onClick={handleCreate} loading={createMut.isPending}>Save as Draft</Button>
                  <Button type="primary" onClick={() => { handleCreate(); }} loading={createMut.isPending}>Create & Start</Button>
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
