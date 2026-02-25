import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Descriptions, Tag, Row, Col, Table, Spin, Empty } from 'antd';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import PageHeader from '../components/shared/PageHeader';
import MapContainer from '../components/map/MapContainer';
import TrajectoryPolyline from '../components/map/TrajectoryPolyline';
import VehicleMarker from '../components/map/VehicleMarker';
import { DRIVING_MODE_COLORS } from '../components/map/drivingModeColors';
import {
  getVehicle,
  getVehicleStatusDistribution,
  getVehicleTrajectory,
  getRuns,
} from '../api/client';

const STATUS_COLORS: Record<string, string> = {
  Offline: '#8E8E93',
  Idle: '#007AFF',
  Active: '#34C759',
  Maintenance: '#FF9500',
};

const IOS_PIE_COLORS: Record<string, string> = {
  Manual: '#8E8E93',
  ACC: '#007AFF',
  LCC: '#76B900',
  HighwayPilot: '#FF9500',
  UrbanPilot: '#AF52DE',
  Standby: '#636366',
  Autonomous: '#5AC8FA',
};

export default function VehicleDetailPage() {
  const { vin } = useParams<{ vin: string }>();
  const navigate = useNavigate();

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle', vin],
    queryFn: () => getVehicle(vin!),
    enabled: !!vin,
  });

  const { data: statusDist } = useQuery({
    queryKey: ['vehicle-status-dist', vin],
    queryFn: () => getVehicleStatusDistribution(vin!),
    enabled: !!vin,
  });

  const { data: trajectory } = useQuery({
    queryKey: ['vehicle-trajectory', vin],
    queryFn: () => getVehicleTrajectory(vin!, { limit: '2000' }),
    enabled: !!vin,
  });

  const { data: runs } = useQuery({
    queryKey: ['vehicle-runs', vin],
    queryFn: () => getRuns({ vehicleVin: vin }),
    enabled: !!vin,
  });

  if (isLoading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (!vehicle) return <Empty description="Vehicle not found" />;

  const formatDuration = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const pieData = (statusDist ?? []).map((d) => ({
    name: d.driving_mode,
    value: d.total_duration_ms,
    mileage: d.total_mileage_km,
  }));

  const activeRuns = (runs ?? []).filter((r) => r.status === 'Active' || r.status === 'Scheduled');

  const cardTitleStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    color: 'var(--text-primary)',
  };

  const labelStyle: React.CSSProperties = { color: 'var(--text-secondary)', fontWeight: 500 };
  const contentStyle: React.CSSProperties = { color: 'var(--text-primary)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader title={vehicle.vin} subtitle={vehicle.modelCode ?? vehicle.platform ?? ''} />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<span style={cardTitleStyle}>Vehicle Info</span>} size="small" className="ios-card">
            <Descriptions column={2} size="small" labelStyle={labelStyle} contentStyle={contentStyle}>
              <Descriptions.Item label="VIN">{vehicle.vin}</Descriptions.Item>
              <Descriptions.Item label="Plate Type">{vehicle.plateType === 'permanent' ? 'Perm' : vehicle.plateType === 'temporary' ? 'Temp' : '—'}</Descriptions.Item>
              <Descriptions.Item label="Model Code">{vehicle.modelCode ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Platform">{vehicle.platform ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="SoC Arch">{vehicle.socArchitecture ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Sensor Suite">{vehicle.sensorSuiteVersion ?? '—'}</Descriptions.Item>
              {vehicle.componentVersions && Object.entries(vehicle.componentVersions).map(([k, v]) => (
                <Descriptions.Item key={k} label={k}>{v}</Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<span style={cardTitleStyle}>Real-time Status</span>} size="small" className="ios-card">
            <Descriptions column={2} size="small" labelStyle={labelStyle} contentStyle={contentStyle}>
              <Descriptions.Item label="Status"><Tag color={STATUS_COLORS[vehicle.status]}>{vehicle.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="Mode">{vehicle.drivingMode ? <Tag color={DRIVING_MODE_COLORS[vehicle.drivingMode]}>{vehicle.drivingMode}</Tag> : '—'}</Descriptions.Item>
              <Descriptions.Item label="Speed">{vehicle.currentSpeed != null ? `${vehicle.currentSpeed.toFixed(1)} m/s` : '—'}</Descriptions.Item>
              <Descriptions.Item label="Battery">{vehicle.fuelOrBatteryLevel != null ? `${vehicle.fuelOrBatteryLevel}%` : '—'}</Descriptions.Item>
              <Descriptions.Item label="Location" span={2}>
                {vehicle.currentLocation ? `${vehicle.currentLocation.lat.toFixed(5)}, ${vehicle.currentLocation.lng.toFixed(5)}` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Last Heartbeat">{vehicle.lastHeartbeat ? new Date(vehicle.lastHeartbeat).toLocaleString() : '—'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title={<span style={cardTitleStyle}>Active Tasks</span>} size="small" className="ios-card" style={{ height: 320 }}>
            {activeRuns.length === 0
              ? <Empty description="No active tasks" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              : <Table
                  dataSource={activeRuns}
                  columns={[
                    { title: 'Run', dataIndex: 'id', key: 'id', render: (id: string) => <a onClick={() => navigate(`/runs/${id}`)}>{id.slice(0, 12)}…</a> },
                    { title: 'Task', dataIndex: 'taskId', key: 'task', render: (t: string) => <a onClick={() => navigate(`/tasks/${t}`)}>{t.slice(0, 12)}…</a> },
                    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'Active' ? '#34C759' : '#007AFF'}>{s}</Tag> },
                  ]}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  scroll={{ y: 220 }}
                />
            }
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={<span style={cardTitleStyle}>Driving Mode Distribution</span>} size="small" className="ios-card" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({ name }) => name}>
                  {pieData.map((d, i) => <Cell key={i} fill={IOS_PIE_COLORS[d.name] ?? DRIVING_MODE_COLORS[d.name] ?? '#8E8E93'} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatDuration(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={<span style={cardTitleStyle}>Mode Mileage (km)</span>} size="small" className="ios-card" style={{ height: 320 }}>
            <Table
              dataSource={statusDist ?? []}
              columns={[
                { title: 'Mode', dataIndex: 'driving_mode', key: 'mode', render: (m: string) => <Tag color={DRIVING_MODE_COLORS[m]}>{m}</Tag> },
                { title: 'Duration', dataIndex: 'total_duration_ms', key: 'dur', render: (v: number) => formatDuration(v) },
                { title: 'Mileage', dataIndex: 'total_mileage_km', key: 'km', render: (v: number) => `${v.toFixed(2)} km` },
              ]}
              rowKey="driving_mode"
              size="small"
              pagination={false}
              scroll={{ y: 220 }}
            />
          </Card>
        </Col>
      </Row>

      <Card title={<span style={cardTitleStyle}>Recent Trajectory</span>} size="small" className="ios-card">
        <div style={{ height: 400 }}>
          <MapContainer
            center={vehicle.currentLocation ? [vehicle.currentLocation.lat, vehicle.currentLocation.lng] : undefined}
            zoom={13}
          >
            {trajectory?.data && <TrajectoryPolyline points={trajectory.data} />}
            {vehicle.currentLocation && (
              <VehicleMarker
                vin={vehicle.vin}
                lat={vehicle.currentLocation.lat}
                lng={vehicle.currentLocation.lng}
                drivingMode={vehicle.drivingMode}
                speed={vehicle.currentSpeed}
              />
            )}
          </MapContainer>
        </div>
      </Card>
    </div>
  );
}
