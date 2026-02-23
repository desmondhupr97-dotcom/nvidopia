import { useCallback, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMapEvents, Marker, Popup } from 'react-leaflet';
import { Empty, List, Tag, Button, message, Spin, Badge, Typography } from 'antd';
import { Trash2, Navigation, MapPin } from 'lucide-react';
import L from 'leaflet';
import type { SimRoute } from '../../api/client';
import { snapRoutesToRoads } from '../../api/client';

const ROUTE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#a855f7'];

const waypointIcon = (color: string) => L.divIcon({
  className: '',
  html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

interface Props {
  routes: SimRoute[];
  onChange: (routes: SimRoute[]) => void;
  mode: 'random' | 'custom';
  startPoint?: { lat: number; lng: number };
}

function ClickHandler({ onAdd }: { onAdd: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onAdd(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

export default function SimRouteEditor({ routes, onChange, mode, startPoint }: Props) {
  const [snapping, setSnapping] = useState(false);

  const center: [number, number] = routes.length > 0 && routes[0]!.waypoints.length > 0
    ? [routes[0]!.waypoints[0]!.lat, routes[0]!.waypoints[0]!.lng]
    : startPoint ? [startPoint.lat, startPoint.lng] : [31.23, 121.47];

  const activeRouteIdx = routes.length > 0 ? routes.length - 1 : -1;

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (mode !== 'custom') return;
    if (routes.length === 0) {
      onChange([{ route_id: `ROUTE-${Date.now().toString(36)}`, name: 'Route 1', waypoints: [{ lat, lng }] }]);
    } else {
      const copy = [...routes];
      const last = { ...copy[activeRouteIdx]!, waypoints: [...copy[activeRouteIdx]!.waypoints, { lat, lng }] };
      copy[activeRouteIdx] = last;
      onChange(copy);
    }
  }, [routes, onChange, mode, activeRouteIdx]);

  const addNewRoute = () => {
    onChange([...routes, { route_id: `ROUTE-${Date.now().toString(36)}`, name: `Route ${routes.length + 1}`, waypoints: [] }]);
  };

  const removeRoute = (idx: number) => {
    onChange(routes.filter((_, i) => i !== idx));
  };

  const handleSnapToRoads = async () => {
    const eligible = routes.filter((r) => r.waypoints.length >= 2);
    if (eligible.length === 0) {
      message.warning('Each route needs at least 2 waypoints to plan a road route');
      return;
    }
    setSnapping(true);
    try {
      const result = await snapRoutesToRoads(routes);
      onChange(result.routes);
      message.success(`${result.routes.length} route(s) snapped to real roads`);
    } catch (err) {
      message.error(`Road planning failed: ${(err as Error).message}`);
    } finally {
      setSnapping(false);
    }
  };

  const hasRoadData = routes.some((r) => r.road);
  const totalDistance = routes.reduce((sum, r) => sum + (r.road?.total_distance_m ?? 0), 0);
  const totalDuration = routes.reduce((sum, r) => sum + (r.road?.total_duration_s ?? 0), 0);

  if (routes.length === 0 && mode === 'random') {
    return <div style={{ marginTop: 16 }}><Empty description="Click 'Generate Routes' above to preview" /></div>;
  }

  return (
    <div style={{ marginTop: 16 }}>
      <Spin spinning={snapping} tip="Snapping routes to real roads via OSRM...">
        <div style={{ height: 400, marginBottom: 12, position: 'relative' }}>
          <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%', borderRadius: 8 }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CartoDB' />
            {mode === 'custom' && <ClickHandler onAdd={handleMapClick} />}

            {routes.map((route, idx) => {
              const color = ROUTE_COLORS[idx % ROUTE_COLORS.length]!;
              const roadCoords = route.road?.coordinates;
              const displayCoords = roadCoords ?? route.waypoints;

              return (
                <span key={route.route_id}>
                  {/* Road polyline (thick, colored) */}
                  <Polyline
                    positions={displayCoords.map((w) => [w.lat, w.lng] as [number, number])}
                    pathOptions={{
                      color,
                      weight: roadCoords ? 4 : 3,
                      opacity: roadCoords ? 0.9 : 0.6,
                      dashArray: roadCoords ? undefined : '8 4',
                    }}
                  />

                  {/* If road data exists, show original waypoints as smaller markers */}
                  {roadCoords && route.waypoints.length > 0 && (
                    <Polyline
                      positions={route.waypoints.map((w) => [w.lat, w.lng] as [number, number])}
                      pathOptions={{ color, weight: 1, opacity: 0.3, dashArray: '4 4' }}
                    />
                  )}

                  {/* Waypoint markers */}
                  {route.waypoints.map((wp, wpIdx) => (
                    <Marker
                      key={`wp-${route.route_id}-${wpIdx}`}
                      position={[wp.lat, wp.lng]}
                      icon={waypointIcon(color)}
                    >
                      <Popup>
                        <div style={{ fontSize: 12 }}>
                          <strong>{route.name || route.route_id}</strong><br />
                          Waypoint {wpIdx + 1}<br />
                          {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* Start marker */}
                  {displayCoords.length > 0 && (
                    <CircleMarker
                      center={[displayCoords[0]!.lat, displayCoords[0]!.lng]}
                      radius={7}
                      pathOptions={{ color: '#fff', fillColor: color, fillOpacity: 1, weight: 2 }}
                    >
                      <Tooltip>{route.name || route.route_id} (Start)</Tooltip>
                    </CircleMarker>
                  )}

                  {/* End marker */}
                  {displayCoords.length > 1 && (
                    <CircleMarker
                      center={[displayCoords[displayCoords.length - 1]!.lat, displayCoords[displayCoords.length - 1]!.lng]}
                      radius={7}
                      pathOptions={{ color: '#fff', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }}
                    >
                      <Tooltip>{route.name || route.route_id} (End)</Tooltip>
                    </CircleMarker>
                  )}
                </span>
              );
            })}
          </MapContainer>
        </div>
      </Spin>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {routes.length} route(s) · {mode === 'custom' ? 'Click map to add waypoints' : 'Auto-generated'}
          {hasRoadData && (
            <span style={{ marginLeft: 8 }}>
              <Badge status="success" text="" style={{ marginRight: 4 }} />
              Road-planned · {(totalDistance / 1000).toFixed(1)} km · ~{Math.round(totalDuration / 60)} min
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {routes.length > 0 && routes.some((r) => r.waypoints.length >= 2) && (
            <Button
              size="small"
              type={hasRoadData ? 'default' : 'primary'}
              icon={<Navigation size={12} />}
              loading={snapping}
              onClick={handleSnapToRoads}
            >
              {hasRoadData ? 'Re-plan Roads' : 'Plan on Roads'}
            </Button>
          )}
          {mode === 'custom' && <Button size="small" icon={<MapPin size={12} />} onClick={addNewRoute}>New Route</Button>}
        </div>
      </div>

      <List
        size="small"
        dataSource={routes}
        renderItem={(route, idx) => (
          <List.Item
            actions={mode === 'custom' ? [<Button size="small" type="text" danger icon={<Trash2 size={12} />} onClick={() => removeRoute(idx)} />] : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <Tag color={ROUTE_COLORS[idx % ROUTE_COLORS.length]}>{route.name || route.route_id}</Tag>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {route.waypoints.length} waypoints
              </span>
              {route.road && (
                <Typography.Text type="success" style={{ fontSize: 11 }}>
                  {(route.road.total_distance_m / 1000).toFixed(1)} km · {route.road.coordinates.length} pts
                </Typography.Text>
              )}
            </div>
          </List.Item>
        )}
      />
    </div>
  );
}
