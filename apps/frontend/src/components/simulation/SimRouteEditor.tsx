import { useCallback, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMapEvents, Marker, Popup } from 'react-leaflet';
import { Empty, List, Tag, Button, message, Spin, Badge, Typography, InputNumber, Space } from 'antd';
import { Trash2, Navigation, MapPin, Edit3, X } from 'lucide-react';
import L from 'leaflet';
import type { SimRoute } from '../../api/client';
import { snapRoutesToRoads } from '../../api/client';

const ROUTE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#a855f7'];

const waypointIcon = (color: string, idx: number) => L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;color:#fff">${idx + 1}</div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface Props {
  routes: SimRoute[];
  onChange: (routes: SimRoute[]) => void;
  mode: 'random' | 'custom';
  startPoint?: { lat: number; lng: number };
}

function ClickHandler({ onAdd }: { onAdd: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onAdd(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export default function SimRouteEditor({ routes, onChange, mode, startPoint }: Props) {
  const [snapping, setSnapping] = useState(false);
  const [activeRouteIdx, setActiveRouteIdx] = useState(-1);
  const [editing, setEditing] = useState(false);

  const center: [number, number] = routes.length > 0 && routes[0]!.waypoints.length > 0
    ? [routes[0]!.waypoints[0]!.lat, routes[0]!.waypoints[0]!.lng]
    : startPoint ? [startPoint.lat, startPoint.lng] : [31.23, 121.47];

  const canEdit = mode === 'custom' || editing;
  const selectedIdx = activeRouteIdx >= 0 && activeRouteIdx < routes.length ? activeRouteIdx : (routes.length > 0 ? routes.length - 1 : -1);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (!canEdit) return;
    const updated = [...routes];
    if (updated.length === 0) {
      updated.push({ route_id: `ROUTE-${Date.now().toString(36)}`, name: 'Route 1', waypoints: [{ lat, lng }] });
    } else {
      const idx = selectedIdx >= 0 ? selectedIdx : updated.length - 1;
      const route = { ...updated[idx]!, waypoints: [...updated[idx]!.waypoints, { lat, lng }] };
      delete route.road;
      updated[idx] = route;
    }
    onChange(updated);
  }, [routes, onChange, canEdit, selectedIdx]);

  const removeWaypoint = (routeIdx: number, wpIdx: number) => {
    const updated = [...routes];
    const route = { ...updated[routeIdx]!, waypoints: updated[routeIdx]!.waypoints.filter((_, i) => i !== wpIdx) };
    delete route.road;
    updated[routeIdx] = route;
    onChange(updated);
  };

  const updateWaypoint = (routeIdx: number, wpIdx: number, lat: number, lng: number) => {
    const updated = [...routes];
    const wps = [...updated[routeIdx]!.waypoints];
    wps[wpIdx] = { lat, lng };
    const route = { ...updated[routeIdx]!, waypoints: wps };
    delete route.road;
    updated[routeIdx] = route;
    onChange(updated);
  };

  const addNewRoute = () => {
    const newIdx = routes.length;
    onChange([...routes, { route_id: `ROUTE-${Date.now().toString(36)}`, name: `Route ${newIdx + 1}`, waypoints: [] }]);
    setActiveRouteIdx(newIdx);
  };

  const removeRoute = (idx: number) => {
    onChange(routes.filter((_, i) => i !== idx));
    if (activeRouteIdx >= routes.length - 1) setActiveRouteIdx(Math.max(0, routes.length - 2));
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

  const toggleEdit = () => {
    setEditing(!editing);
    if (!editing && routes.length > 0) setActiveRouteIdx(routes.length - 1);
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
            {canEdit && <ClickHandler onAdd={handleMapClick} />}

            {routes.map((route, idx) => {
              const color = ROUTE_COLORS[idx % ROUTE_COLORS.length]!;
              const roadCoords = route.road?.coordinates;
              const displayCoords = roadCoords ?? route.waypoints;
              const isSelected = idx === selectedIdx;

              return (
                <span key={route.route_id}>
                  <Polyline
                    positions={displayCoords.map((w) => [w.lat, w.lng] as [number, number])}
                    pathOptions={{
                      color,
                      weight: roadCoords ? 4 : 3,
                      opacity: isSelected ? 0.9 : 0.4,
                      dashArray: roadCoords ? undefined : '8 4',
                    }}
                  />

                  {roadCoords && route.waypoints.length > 0 && (
                    <Polyline
                      positions={route.waypoints.map((w) => [w.lat, w.lng] as [number, number])}
                      pathOptions={{ color, weight: 1, opacity: 0.3, dashArray: '4 4' }}
                    />
                  )}

                  {route.waypoints.map((wp, wpIdx) => (
                    <Marker
                      key={`wp-${route.route_id}-${wpIdx}`}
                      position={[wp.lat, wp.lng]}
                      icon={waypointIcon(color, wpIdx)}
                      draggable={canEdit}
                      eventHandlers={{
                        dragend: (e) => {
                          const ll = e.target.getLatLng();
                          updateWaypoint(idx, wpIdx, ll.lat, ll.lng);
                        },
                      }}
                    >
                      <Popup>
                        <div style={{ fontSize: 12, minWidth: 180 }}>
                          <strong>{route.name || route.route_id}</strong> — WP {wpIdx + 1}<br />
                          <Space size={4} style={{ marginTop: 4 }}>
                            <InputNumber size="small" style={{ width: 90 }} step={0.0001} value={Number(wp.lat.toFixed(5))}
                              onChange={(v) => v != null && updateWaypoint(idx, wpIdx, v, wp.lng)} />
                            <InputNumber size="small" style={{ width: 90 }} step={0.0001} value={Number(wp.lng.toFixed(5))}
                              onChange={(v) => v != null && updateWaypoint(idx, wpIdx, wp.lat, v)} />
                          </Space>
                          {canEdit && (
                            <div style={{ marginTop: 4 }}>
                              <Button size="small" type="text" danger icon={<Trash2 size={10} />} onClick={() => removeWaypoint(idx, wpIdx)}>Remove</Button>
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}

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
      </Spin>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {routes.length} route(s) · {canEdit ? 'Click map to add waypoints · Drag to move' : 'View only'}
          {hasRoadData && (
            <span style={{ marginLeft: 8 }}>
              <Badge status="success" text="" style={{ marginRight: 4 }} />
              Road-planned · {(totalDistance / 1000).toFixed(1)} km · ~{Math.round(totalDuration / 60)} min
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {routes.length > 0 && routes.some((r) => r.waypoints.length >= 2) && (
            <Button size="small" type={hasRoadData ? 'default' : 'primary'} icon={<Navigation size={12} />} loading={snapping} onClick={handleSnapToRoads}>
              {hasRoadData ? 'Re-plan Roads' : 'Plan on Roads'}
            </Button>
          )}
          {mode === 'random' && routes.length > 0 && (
            <Button size="small" type={editing ? 'primary' : 'default'} icon={editing ? <X size={12} /> : <Edit3 size={12} />} onClick={toggleEdit}>
              {editing ? 'Done Editing' : 'Edit Waypoints'}
            </Button>
          )}
          {canEdit && <Button size="small" icon={<MapPin size={12} />} onClick={addNewRoute}>New Route</Button>}
        </div>
      </div>

      <List
        size="small"
        dataSource={routes}
        renderItem={(route, idx) => {
          const isSelected = idx === selectedIdx && canEdit;
          return (
            <List.Item
              style={{ cursor: canEdit ? 'pointer' : undefined, background: isSelected ? 'rgba(99,102,241,0.1)' : undefined, borderRadius: 4 }}
              onClick={() => canEdit && setActiveRouteIdx(idx)}
              actions={canEdit ? [<Button size="small" type="text" danger icon={<Trash2 size={12} />} onClick={(e) => { e.stopPropagation(); removeRoute(idx); }} />] : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <Tag color={ROUTE_COLORS[idx % ROUTE_COLORS.length]}>{route.name || route.route_id}</Tag>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{route.waypoints.length} waypoints</span>
                {route.road && (
                  <Typography.Text type="success" style={{ fontSize: 11 }}>
                    {(route.road.total_distance_m / 1000).toFixed(1)} km · {route.road.coordinates.length} pts
                  </Typography.Text>
                )}
                {isSelected && <Tag color="processing" style={{ fontSize: 10 }}>Active</Tag>}
              </div>
            </List.Item>
          );
        }}
      />
    </div>
  );
}
