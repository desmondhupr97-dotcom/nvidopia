import { useEffect, useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Tag, Select, Space } from 'antd';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '../components/shared/PageHeader';
import MapContainer from '../components/map/MapContainer';
import VehicleMarker from '../components/map/VehicleMarker';
import { DRIVING_MODE_COLORS } from '../components/map/drivingModeColors';
import EntityLink from '../components/shared/EntityLink';
import {
  getVehicles,
  getFleetDistribution,
  getFleetStatusDistribution,
  type Vehicle,
} from '../api/client';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const SSE_URL = `${BASE_URL}/api/sse/vehicles`;

const STATUS_COLORS: Record<string, string> = {
  Offline: '#8E8E93', Idle: '#007AFF', Active: '#34C759', Maintenance: '#FF9500',
};

const CHART_PALETTE = ['#76B900', '#007AFF', '#FF9500', '#AF52DE', '#FF3B30', '#5AC8FA', '#FFCC00', '#8E8E93'];

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

  const stats = useMemo(() => {
    const all = mergedVehicles;
    const online = all.filter((v) => v.status === 'Active' || v.status === 'Idle').length;
    const issues = all.filter((v) => v.status === 'Maintenance').length;
    const activeCount = all.filter((v) => v.status === 'Active').length;
    const uptime = all.length > 0 ? Math.round((activeCount / all.length) * 100) : 0;
    return { total: all.length, online, issues, uptime };
  }, [mergedVehicles]);

  const statCards = [
    { label: 'Total Vehicles', value: stats.total, color: '#76B900' },
    { label: 'Online', value: stats.online, color: '#007AFF' },
    { label: 'Issues', value: stats.issues, color: '#FF9500' },
    { label: 'Avg Uptime', value: `${stats.uptime}%`, color: '#34C759' },
  ];

  const columns: ColumnsType<Vehicle> = [
    {
      title: 'VIN', dataIndex: 'vin', key: 'vin', width: 180,
      render: (vin: string) => <EntityLink to={`/fleet/vehicles/${vin}`} mono>{vin}</EntityLink>,
    },
    {
      title: 'Plate', dataIndex: 'plateType', key: 'plateType', width: 100,
      render: (v: string) => v ? <Tag>{v === 'permanent' ? 'Perm' : 'Temp'}</Tag> : '—',
    },
    { title: 'Model', dataIndex: 'modelCode', key: 'modelCode', width: 100, render: (v: string) => v ?? '—' },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 100,
      render: (s: string) => <Tag color={STATUS_COLORS[s] ?? '#8E8E93'}>{s}</Tag>,
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

  const formatDuration = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div>
      <PageHeader title="Fleet Dashboard" subtitle={`${mergedVehicles.length} vehicles`} />

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {statCards.map((s) => (
          <div className="stat-card" key={s.label}>
            <span className="stat-card-label">{s.label}</span>
            <span className="stat-card-value" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 16 }}>
        <Space size="small" wrap>
          <Select allowClear placeholder="Plate" style={{ width: 110 }} value={plateFilter} onChange={setPlateFilter} options={[{ value: 'permanent', label: 'Perm' }, { value: 'temporary', label: 'Temp' }]} />
          <Select allowClear placeholder="Model" style={{ width: 120 }} value={modelFilter} onChange={setModelFilter} options={(distribution?.model_code ?? []).map((d) => ({ value: d.name, label: d.name }))} />
          <Select allowClear placeholder="Status" style={{ width: 120 }} value={statusFilter} onChange={setStatusFilter} options={['Offline', 'Idle', 'Active', 'Maintenance'].map((s) => ({ value: s, label: s }))} />
          <Select allowClear placeholder="Mode" style={{ width: 130 }} value={modeFilter} onChange={setModeFilter} options={Object.keys(DRIVING_MODE_COLORS).map((m) => ({ value: m, label: m }))} />
        </Space>
      </div>

      {/* Map + List 60/40 split */}
      <div className="ios-card" style={{ display: 'flex', gap: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ flex: '0 0 60%', borderRight: '1px solid var(--border-secondary)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-secondary)', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
            Live Map
          </div>
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
        </div>
        <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-secondary)', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
            Vehicles
            <span style={{ fontWeight: 400, fontSize: '0.8125rem', color: 'var(--text-muted)', marginLeft: 8 }}>{filtered.length}</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Table<Vehicle>
              dataSource={filtered}
              columns={columns}
              rowKey="vin"
              size="small"
              loading={vehiclesLoading}
              scroll={{ y: 410 }}
              pagination={false}
              onRow={(record) => ({ onClick: () => navigate(`/fleet/vehicles/${record.vin}`), style: { cursor: 'pointer' } })}
            />
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="ios-card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: 16 }}>Plate Type</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={distribution?.plate_type ?? []} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, count }) => `${name}: ${count}`}>
                {(distribution?.plate_type ?? []).map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="ios-card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: 16 }}>Model Distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distribution?.model_code ?? []}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#76B900" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="ios-card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: 16 }}>Status Duration Distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusDist ?? []} layout="vertical">
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v: number) => formatDuration(v)} />
              <YAxis dataKey="driving_mode" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={90} />
              <Tooltip formatter={(v: number) => formatDuration(v)} />
              <Bar dataKey="total_duration_ms" fill="#34C759" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
