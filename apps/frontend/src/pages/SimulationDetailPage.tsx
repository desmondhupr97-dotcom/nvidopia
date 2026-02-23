import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Space, Tag, Row, Col, Statistic, Descriptions, message } from 'antd';
import { ArrowLeft, Play, Pause, Square } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import {
  getSimulation, getSimulationStats, startSimulation, pauseSimulation,
  resumeSimulation, stopSimulation,
} from '../api/client';

const statusColor: Record<string, string> = {
  Draft: 'default', Running: 'processing', Paused: 'warning', Completed: 'success', Aborted: 'error',
};

const ROUTE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#a855f7'];

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
      return s?.status === 'Running' ? 3000 : false;
    },
  });

  const { data: liveStats } = useQuery({
    queryKey: ['simulation-stats', id],
    queryFn: () => getSimulationStats(id!),
    enabled: !!id && session?.status === 'Running',
    refetchInterval: 3000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['simulation', id] });
    queryClient.invalidateQueries({ queryKey: ['simulation-stats', id] });
    queryClient.invalidateQueries({ queryKey: ['simulations'] });
  };

  const startMut = useMutation({ mutationFn: () => startSimulation(id!), onSuccess: () => { invalidate(); message.success('Started'); } });
  const pauseMut = useMutation({ mutationFn: () => pauseSimulation(id!), onSuccess: () => { invalidate(); message.success('Paused'); } });
  const resumeMut = useMutation({ mutationFn: () => resumeSimulation(id!), onSuccess: () => { invalidate(); message.success('Resumed'); } });
  const stopMut = useMutation({ mutationFn: () => stopSimulation(id!), onSuccess: () => { invalidate(); message.success('Stopped'); } });

  if (isLoading || !session) {
    return <Card className="glass-panel" loading />;
  }

  const stats = liveStats ?? session.stats;
  const routes = session.route_config?.routes ?? [];
  const startPoint = session.route_config?.random_config?.start_point;
  const center: [number, number] = routes.length > 0 && routes[0]!.waypoints.length > 0
    ? [routes[0]!.waypoints[0]!.lat, routes[0]!.waypoints[0]!.lng]
    : startPoint ? [startPoint.lat, startPoint.lng] : [31.23, 121.47];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
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
            <Button type="primary" icon={<Play size={14} />} onClick={() => session.status === 'Draft' ? startMut.mutate() : resumeMut.mutate()} loading={startMut.isPending || resumeMut.isPending}>
              {session.status === 'Draft' ? 'Start' : 'Resume'}
            </Button>
          )}
          {session.status === 'Running' && (
            <>
              <Button icon={<Pause size={14} />} onClick={() => pauseMut.mutate()} loading={pauseMut.isPending}>Pause</Button>
              <Button danger icon={<Square size={14} />} onClick={() => stopMut.mutate()} loading={stopMut.isPending}>Stop</Button>
            </>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card className="glass-panel glow-accent-hover">
            <Statistic title="Vehicles" value={session.fleet_config?.vehicle_count ?? session.fleet_config?.vehicles?.length ?? 0} valueStyle={{ fontFamily: "'Orbitron', sans-serif", color: '#6366f1' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="glass-panel glow-accent-hover">
            <Statistic title="Telemetry Sent" value={stats?.telemetry_sent ?? 0} valueStyle={{ fontFamily: "'Orbitron', sans-serif", color: '#22c55e' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="glass-panel glow-accent-hover">
            <Statistic title="Issues Reported" value={stats?.issues_sent ?? 0} valueStyle={{ fontFamily: "'Orbitron', sans-serif", color: '#f59e0b' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="glass-panel glow-accent-hover">
            <Statistic title="Total Mileage" value={Number(stats?.total_mileage_km ?? 0).toFixed(1)} suffix="km" valueStyle={{ fontFamily: "'Orbitron', sans-serif", color: '#3b82f6' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card className="glass-panel" title="Route Map" style={{ height: 480 }}>
            <div style={{ height: 400 }}>
              <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%', borderRadius: 8 }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CartoDB' />
                {routes.map((route, idx) => {
                  const color = ROUTE_COLORS[idx % ROUTE_COLORS.length]!;
                  const roadCoords = route.road?.coordinates;
                  const displayCoords = roadCoords ?? route.waypoints;
                  return (
                    <span key={route.route_id}>
                      <Polyline
                        positions={displayCoords.map((w) => [w.lat, w.lng] as [number, number])}
                        pathOptions={{ color, weight: roadCoords ? 4 : 3, opacity: roadCoords ? 0.9 : 0.7, dashArray: roadCoords ? undefined : '8 4' }}
                      />
                      {roadCoords && (
                        <Polyline
                          positions={route.waypoints.map((w) => [w.lat, w.lng] as [number, number])}
                          pathOptions={{ color, weight: 1, opacity: 0.25, dashArray: '4 4' }}
                        />
                      )}
                      {displayCoords.length > 0 && (
                        <CircleMarker center={[displayCoords[0]!.lat, displayCoords[0]!.lng]} radius={7} pathOptions={{ color: '#fff', fillColor: color, fillOpacity: 1, weight: 2 }}>
                          <Tooltip>{route.name || route.route_id} (Start)</Tooltip>
                        </CircleMarker>
                      )}
                      {displayCoords.length > 1 && (
                        <CircleMarker center={[displayCoords[displayCoords.length - 1]!.lat, displayCoords[displayCoords.length - 1]!.lng]} radius={7} pathOptions={{ color: '#fff', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }}>
                          <Tooltip>{route.name || route.route_id} (End)</Tooltip>
                        </CircleMarker>
                      )}
                    </span>
                  );
                })}
              </MapContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card className="glass-panel" title="Configuration">
            <Descriptions column={1} size="small" labelStyle={{ color: 'var(--text-muted)' }}>
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
        </Col>
      </Row>
    </div>
  );
}
