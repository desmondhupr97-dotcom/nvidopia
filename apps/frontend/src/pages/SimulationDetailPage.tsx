import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Space, Tag, Row, Col, Statistic, Descriptions, Table, message } from 'antd';
import { ArrowLeft, Play, Pause, Square } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  getSimulation, getSimulationStats, getSimulationVehicles, startSimulation,
  pauseSimulation, resumeSimulation, stopSimulation,
  type SimVehiclePosition,
} from '../api/client';

const statusColor: Record<string, string> = {
  Draft: 'default', Running: 'processing', Paused: 'warning', Completed: 'success', Aborted: 'error',
};

const VEHICLE_COLORS = ['#34C759', '#007AFF', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#76B900', '#FF2D55'];
const ROUTE_COLORS = ['#007AFF', '#76B900', '#FF9500', '#FF3B30', '#34C759', '#AF52DE', '#5AC8FA', '#FF2D55'];

function carIcon(color: string, heading: number) {
  return L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;transform:rotate(${heading}deg)">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="${color}" stroke="#fff" stroke-width="1.5">
        <path d="M12 2L6 12l6 4 6-4z"/>
      </svg>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function VehicleMarkers({ vehicles }: { vehicles: SimVehiclePosition[] }) {
  const map = useMap();
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    const currentVins = new Set<string>();

    vehicles.forEach((v, idx) => {
      if (!v.current) return;
      currentVins.add(v.vin);
      const color = VEHICLE_COLORS[idx % VEHICLE_COLORS.length]!;
      const pos = L.latLng(v.current.lat, v.current.lng);
      const heading = v.current.heading_deg ?? 0;

      const existing = markersRef.current.get(v.vin);
      if (existing) {
        existing.setLatLng(pos);
        existing.setIcon(carIcon(color, heading));
      } else {
        const marker = L.marker(pos, { icon: carIcon(color, heading) })
          .bindTooltip(`${v.vin}<br/>${(v.current.speed_mps * 3.6).toFixed(0)} km/h · ${v.current.driving_mode}`, { direction: 'top', offset: [0, -12] })
          .addTo(map);
        markersRef.current.set(v.vin, marker);
      }

      const m = markersRef.current.get(v.vin)!;
      m.setTooltipContent(`${v.vin}<br/>${(v.current.speed_mps * 3.6).toFixed(0)} km/h · ${v.current.driving_mode}`);
    });

    markersRef.current.forEach((marker, vin) => {
      if (!currentVins.has(vin)) {
        marker.remove();
        markersRef.current.delete(vin);
      }
    });
  }, [vehicles, map]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
    };
  }, []);

  return null;
}

export default function SimulationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useQuery({
    queryKey: ['simulation', id],
    queryFn: () => getSimulation(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const s = query.state.data;
      return s?.status === 'Running' ? 5000 : false;
    },
  });

  const { data: liveStats } = useQuery({
    queryKey: ['simulation-stats', id],
    queryFn: () => getSimulationStats(id!),
    enabled: !!id && session?.status === 'Running',
    refetchInterval: 3000,
  });

  const isRunning = session?.status === 'Running';
  const isCompleted = session?.status === 'Completed';

  const { data: vehiclePositions } = useQuery({
    queryKey: ['simulation-vehicles', id],
    queryFn: () => getSimulationVehicles(id!, 50),
    enabled: !!id && (isRunning || isCompleted),
    refetchInterval: isRunning ? 3000 : false,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['simulation', id] });
    queryClient.invalidateQueries({ queryKey: ['simulation-stats', id] });
    queryClient.invalidateQueries({ queryKey: ['simulation-vehicles', id] });
    queryClient.invalidateQueries({ queryKey: ['simulations'] });
  };

  const startMut = useMutation({ mutationFn: () => startSimulation(id!), onSuccess: () => { invalidate(); message.success('Started'); } });
  const pauseMut = useMutation({ mutationFn: () => pauseSimulation(id!), onSuccess: () => { invalidate(); message.success('Paused'); } });
  const resumeMut = useMutation({ mutationFn: () => resumeSimulation(id!), onSuccess: () => { invalidate(); message.success('Resumed'); } });
  const stopMut = useMutation({ mutationFn: () => stopSimulation(id!), onSuccess: () => { invalidate(); message.success('Stopped'); } });

  if (isLoading || !session) {
    return <Card className="ios-card" loading />;
  }

  const stats = liveStats ?? session.stats;
  const routes = session.route_config?.routes ?? [];
  const startPoint = session.route_config?.random_config?.start_point;
  const vehicles = vehiclePositions ?? [];

  const center: [number, number] = (() => {
    const firstVehicle = vehicles.find((v) => v.current);
    if (firstVehicle?.current) return [firstVehicle.current.lat, firstVehicle.current.lng];
    if (routes.length > 0 && routes[0]!.waypoints.length > 0) return [routes[0]!.waypoints[0]!.lat, routes[0]!.waypoints[0]!.lng];
    if (startPoint) return [startPoint.lat, startPoint.lng];
    return [31.23, 121.47];
  })() as [number, number];

  const cardTitleStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    color: 'var(--text-primary)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button type="text" icon={<ArrowLeft size={18} />} onClick={() => navigate('/simulation')} />
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>{session.name}</h1>
          <Space>
            <Tag color={statusColor[session.status]}>{session.status}</Tag>
            {session.started_at && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Started: {new Date(session.started_at).toLocaleString()}</span>}
          </Space>
        </div>
        <Space>
          {(session.status === 'Draft' || session.status === 'Paused') && (
            <Button
              type="primary"
              icon={<Play size={14} />}
              onClick={() => session.status === 'Draft' ? startMut.mutate() : resumeMut.mutate()}
              loading={startMut.isPending || resumeMut.isPending}
              style={{ background: '#34C759', borderColor: '#34C759' }}
            >
              {session.status === 'Draft' ? 'Start' : 'Resume'}
            </Button>
          )}
          {session.status === 'Running' && (
            <>
              <Button
                icon={<Pause size={14} />}
                onClick={() => pauseMut.mutate()}
                loading={pauseMut.isPending}
                style={{ color: '#FF9500', borderColor: '#FF9500' }}
              >
                Pause
              </Button>
              <Button
                danger
                icon={<Square size={14} />}
                onClick={() => stopMut.mutate()}
                loading={stopMut.isPending}
                style={{ color: '#FF3B30', borderColor: '#FF3B30' }}
              >
                Stop
              </Button>
            </>
          )}
        </Space>
      </div>

      {/* Stats Row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card className="ios-card">
            <Statistic title="Vehicles" value={session.fleet_config?.vehicle_count ?? session.fleet_config?.vehicles?.length ?? 0} valueStyle={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="ios-card">
            <Statistic title="Telemetry Sent" value={stats?.telemetry_sent ?? 0} valueStyle={{ fontFamily: 'var(--font-mono)', color: '#34C759' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="ios-card">
            <Statistic title="Issues Reported" value={stats?.issues_sent ?? 0} valueStyle={{ fontFamily: 'var(--font-mono)', color: '#FF9500' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="ios-card">
            <Statistic title="Total Mileage" value={Number(stats?.total_mileage_km ?? 0).toFixed(1)} suffix="km" valueStyle={{ fontFamily: 'var(--font-mono)', color: '#76B900' }} />
          </Card>
        </Col>
      </Row>

      {/* Map + Config */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card className="ios-card" title={<span style={cardTitleStyle}>{isRunning ? 'Live Vehicle Map' : 'Route Map'}</span>} style={{ height: 520 }}>
            <div style={{ height: 440 }}>
              <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%', borderRadius: 8 }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; CartoDB' />

                {routes.map((route, idx) => {
                  const color = ROUTE_COLORS[idx % ROUTE_COLORS.length]!;
                  const roadCoords = route.road?.coordinates;
                  const displayCoords = roadCoords ?? route.waypoints;
                  return (
                    <Polyline
                      key={`route-${route.route_id}`}
                      positions={displayCoords.map((w) => [w.lat, w.lng] as [number, number])}
                      pathOptions={{
                        color,
                        weight: vehicles.length > 0 ? 2 : 4,
                        opacity: vehicles.length > 0 ? 0.25 : 0.8,
                        dashArray: roadCoords ? undefined : '8 4',
                      }}
                    />
                  );
                })}

                {vehicles.map((v, idx) => {
                  const color = VEHICLE_COLORS[idx % VEHICLE_COLORS.length]!;
                  if (v.trail.length < 2) return null;
                  return (
                    <Polyline
                      key={`trail-${v.vin}`}
                      positions={v.trail.map((p) => [p.lat, p.lng] as [number, number])}
                      pathOptions={{ color, weight: 4, opacity: 0.9 }}
                    />
                  );
                })}

                {vehicles.length === 0 && routes.map((route, idx) => {
                  const color = ROUTE_COLORS[idx % ROUTE_COLORS.length]!;
                  const displayCoords = route.road?.coordinates ?? route.waypoints;
                  return (
                    <span key={`markers-${route.route_id}`}>
                      {displayCoords.length > 0 && (
                        <CircleMarker center={[displayCoords[0]!.lat, displayCoords[0]!.lng]} radius={6} pathOptions={{ color: '#fff', fillColor: color, fillOpacity: 1, weight: 2 }}>
                          <Tooltip>{route.name || route.route_id} (Start)</Tooltip>
                        </CircleMarker>
                      )}
                    </span>
                  );
                })}

                <VehicleMarkers vehicles={vehicles} />
              </MapContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card className="ios-card" title={<span style={cardTitleStyle}>Configuration</span>} style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small" labelStyle={{ color: 'var(--text-secondary)', fontWeight: 500 }} contentStyle={{ color: 'var(--text-primary)' }}>
              <Descriptions.Item label="Fleet Mode">{session.fleet_config?.mode}</Descriptions.Item>
              <Descriptions.Item label="Route Mode">{session.route_config?.mode}</Descriptions.Item>
              <Descriptions.Item label="Routes">{routes.length} route(s){routes.some((r) => r.road) ? ' (road-planned)' : ''}</Descriptions.Item>
              {routes.some((r) => r.road) && (
                <Descriptions.Item label="Road Distance">{(routes.reduce((s, r) => s + (r.road?.total_distance_m ?? 0), 0) / 1000).toFixed(1)} km total</Descriptions.Item>
              )}
              <Descriptions.Item label="Telemetry Interval">{(session.report_config?.telemetry_interval_ms ?? 3000) / 1000}s</Descriptions.Item>
              <Descriptions.Item label="Issue Interval">{((session.report_config?.issue_interval_range_ms?.[0] ?? 30000) / 1000)}s - {((session.report_config?.issue_interval_range_ms?.[1] ?? 120000) / 1000)}s</Descriptions.Item>
              <Descriptions.Item label="Mode Switch">{(session.report_config?.status_change_interval_ms ?? 60000) / 1000}s</Descriptions.Item>
              <Descriptions.Item label="Speed Range">{Math.round((session.report_config?.speed_range_mps?.[0] ?? 8) * 3.6)} - {Math.round((session.report_config?.speed_range_mps?.[1] ?? 33) * 3.6)} km/h</Descriptions.Item>
            </Descriptions>
          </Card>

          {vehicles.length > 0 && (
            <Card className="ios-card" title={<span style={cardTitleStyle}>Vehicle Status</span>}>
              <Table
                size="small"
                dataSource={vehicles}
                rowKey="vin"
                pagination={false}
                columns={[
                  {
                    title: '', width: 12, render: (_: unknown, _r: SimVehiclePosition, idx: number) => (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: VEHICLE_COLORS[idx % VEHICLE_COLORS.length] }} />
                    ),
                  },
                  { title: 'VIN', dataIndex: 'vin', ellipsis: true, render: (v: string) => <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{v}</span> },
                  {
                    title: 'Speed', render: (_: unknown, r: SimVehiclePosition) =>
                      r.current ? `${(r.current.speed_mps * 3.6).toFixed(0)} km/h` : '-',
                  },
                  {
                    title: 'Mode', render: (_: unknown, r: SimVehiclePosition) =>
                      r.current ? <Tag color="blue" style={{ fontSize: 10 }}>{r.current.driving_mode}</Tag> : '-',
                  },
                  {
                    title: 'Trail', render: (_: unknown, r: SimVehiclePosition) =>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.trail.length} pts</span>,
                  },
                ]}
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
