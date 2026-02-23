import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Tag, Card, Row, Col, Select, Space } from 'antd';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '../components/shared/PageHeader';
import MapContainer from '../components/map/MapContainer';
import VehicleMarker from '../components/map/VehicleMarker';
import { DRIVING_MODE_COLORS } from '../components/map/drivingModeColors';
import {
  getVehicles,
  getFleetDistribution,
  getFleetStatusDistribution,
  type Vehicle,
} from '../api/client';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const SSE_URL = `${BASE_URL}/api/sse/vehicles`;

const STATUS_COLORS: Record<string, string> = {
  Offline: '#595959', Idle: '#1890ff', Active: '#52c41a', Maintenance: '#fa8c16',
};

export default function FleetDashboardPage() {
  const navigate = useNavigate();
  const [plateFilter, setPlateFilter] = useState<string>();
  const [modelFilter, setModelFilter] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<string>();
  const [modeFilter, setModeFilter] = useState<string>();

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => getVehicles(),
    refetchInterval: 15000,
  });

  const { data: distribution } = useQuery({
    queryKey: ['fleet-distribution'],
    queryFn: getFleetDistribution,
  });

  const { data: statusDist } = useQuery({
    queryKey: ['fleet-status-distribution'],
    queryFn: getFleetStatusDistribution,
  });

  const [liveUpdates, setLiveUpdates] = useState<Record<string, Partial<Vehicle>>>({});
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(SSE_URL);
    eventSourceRef.current = es;
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        const vin = data.vin;
        if (!vin) return;
        setLiveUpdates((prev) => ({
          ...prev,
          [vin]: {
            currentLocation: data.current_location,
            currentSpeed: data.current_speed_mps,
            drivingMode: data.driving_mode,
            status: data.current_status,
          },
        }));
      } catch { /* ignore */ }
    };
    return () => { es.close(); };
  }, []);

  const mergedVehicles = (vehicles ?? []).map((v) => {
    const live = liveUpdates[v.vin];
    if (!live) return v;
    return { ...v, ...live };
  });

  const filtered = mergedVehicles.filter((v) => {
    if (plateFilter && v.plateType !== plateFilter) return false;
    if (modelFilter && v.modelCode !== modelFilter) return false;
    if (statusFilter && v.status !== statusFilter) return false;
    if (modeFilter && v.drivingMode !== modeFilter) return false;
    return true;
  });

  const onlineVehicles = filtered.filter((v) => v.currentLocation?.lat && v.currentLocation?.lng);

  const columns: ColumnsType<Vehicle> = [
    {
      title: 'VIN', dataIndex: 'vin', key: 'vin', width: 180,
      render: (vin: string) => <a onClick={() => navigate(`/fleet/vehicles/${vin}`)}>{vin}</a>,
    },
    {
      title: 'Plate', dataIndex: 'plateType', key: 'plateType', width: 100,
      render: (v: string) => v ? <Tag>{v === 'permanent' ? 'Perm' : 'Temp'}</Tag> : '—',
    },
    { title: 'Model', dataIndex: 'modelCode', key: 'modelCode', width: 100, render: (v: string) => v ?? '—' },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 100,
      render: (s: string) => <Tag color={STATUS_COLORS[s] ?? '#595959'}>{s}</Tag>,
    },
    {
      title: 'Mode', dataIndex: 'drivingMode', key: 'drivingMode', width: 120,
      render: (m: string) => m ? <Tag color={DRIVING_MODE_COLORS[m]}>{m}</Tag> : '—',
    },
    {
      title: 'Speed', dataIndex: 'currentSpeed', key: 'speed', width: 100,
      render: (v: number) => v != null ? `${v.toFixed(1)} m/s` : '—',
    },
    { title: 'Platform', dataIndex: 'platform', key: 'platform', width: 120, render: (v: string) => v ?? '—' },
  ];

  const PIE_COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#722ed1', '#f5222d', '#13c2c2', '#fadb14', '#595959'];

  const formatDuration = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader title="Fleet Dashboard" subtitle={`${mergedVehicles.length} vehicles`} />

      <Row gutter={16}>
        <Col span={12}>
          <Card title="Vehicles" size="small" className="glass-card" style={{ height: 520 }} extra={
            <Space size="small">
              <Select allowClear placeholder="Plate" style={{ width: 100 }} value={plateFilter} onChange={setPlateFilter} options={[{ value: 'permanent', label: 'Perm' }, { value: 'temporary', label: 'Temp' }]} />
              <Select allowClear placeholder="Model" style={{ width: 100 }} value={modelFilter} onChange={setModelFilter} options={(distribution?.model_code ?? []).map((d) => ({ value: d.name, label: d.name }))} />
              <Select allowClear placeholder="Status" style={{ width: 100 }} value={statusFilter} onChange={setStatusFilter} options={['Offline', 'Idle', 'Active', 'Maintenance'].map((s) => ({ value: s, label: s }))} />
              <Select allowClear placeholder="Mode" style={{ width: 110 }} value={modeFilter} onChange={setModeFilter} options={Object.keys(DRIVING_MODE_COLORS).map((m) => ({ value: m, label: m }))} />
            </Space>
          }>
            <Table<Vehicle>
              dataSource={filtered}
              columns={columns}
              rowKey="vin"
              size="small"
              loading={vehiclesLoading}
              scroll={{ y: 380 }}
              pagination={false}
              onRow={(record) => ({ onClick: () => navigate(`/fleet/vehicles/${record.vin}`), style: { cursor: 'pointer' } })}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Live Map" size="small" className="glass-card" style={{ height: 520 }}>
            <div style={{ height: 460 }}>
              <MapContainer>
                {onlineVehicles.map((v) => (
                  <VehicleMarker
                    key={v.vin}
                    vin={v.vin}
                    lat={v.currentLocation!.lat}
                    lng={v.currentLocation!.lng}
                    drivingMode={v.drivingMode}
                    speed={v.currentSpeed}
                    onClick={() => navigate(`/fleet/vehicles/${v.vin}`)}
                  />
                ))}
              </MapContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Card title="Plate Type" size="small" className="glass-card">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={distribution?.plate_type ?? []} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, count }) => `${name}: ${count}`}>
                  {(distribution?.plate_type ?? []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Model Distribution" size="small" className="glass-card">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={distribution?.model_code ?? []}>
                <XAxis dataKey="name" tick={{ fill: '#aaa', fontSize: 11 }} />
                <YAxis tick={{ fill: '#aaa', fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1890ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Status Duration Distribution" size="small" className="glass-card">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusDist ?? []} layout="vertical">
                <XAxis type="number" tick={{ fill: '#aaa', fontSize: 11 }} tickFormatter={(v: number) => formatDuration(v)} />
                <YAxis dataKey="driving_mode" type="category" tick={{ fill: '#aaa', fontSize: 11 }} width={90} />
                <Tooltip formatter={(v: number) => formatDuration(v)} />
                <Bar dataKey="total_duration_ms" fill="#52c41a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
