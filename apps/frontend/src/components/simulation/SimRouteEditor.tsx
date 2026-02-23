import { useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet';
import { Empty, List, Tag, Button } from 'antd';
import { Trash2 } from 'lucide-react';
import type { SimRoute } from '../../api/client';

const ROUTE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#a855f7'];

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

  if (routes.length === 0 && mode === 'random') {
    return <div style={{ marginTop: 16 }}><Empty description="Click 'Generate Routes' above to preview" /></div>;
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ height: 360, marginBottom: 12 }}>
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%', borderRadius: 8 }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CartoDB' />
          {mode === 'custom' && <ClickHandler onAdd={handleMapClick} />}
          {routes.map((route, idx) => (
            <Polyline
              key={route.route_id}
              positions={route.waypoints.map((w) => [w.lat, w.lng] as [number, number])}
              pathOptions={{ color: ROUTE_COLORS[idx % ROUTE_COLORS.length], weight: 3, opacity: 0.8 }}
            />
          ))}
          {routes.map((route, idx) => route.waypoints.length > 0 && (
            <CircleMarker
              key={`start-${route.route_id}`}
              center={[route.waypoints[0]!.lat, route.waypoints[0]!.lng]}
              radius={6}
              pathOptions={{ color: ROUTE_COLORS[idx % ROUTE_COLORS.length], fillColor: ROUTE_COLORS[idx % ROUTE_COLORS.length], fillOpacity: 1 }}
            >
              <Tooltip>{route.name || route.route_id}</Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{routes.length} route(s) · {mode === 'custom' ? 'Click map to add waypoints' : 'Auto-generated'}</span>
        {mode === 'custom' && <Button size="small" onClick={addNewRoute}>New Route</Button>}
      </div>
      <List
        size="small"
        dataSource={routes}
        renderItem={(route, idx) => (
          <List.Item
            actions={mode === 'custom' ? [<Button size="small" type="text" danger icon={<Trash2 size={12} />} onClick={() => removeRoute(idx)} />] : undefined}
          >
            <Tag color={ROUTE_COLORS[idx % ROUTE_COLORS.length]}>{route.name || route.route_id}</Tag>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{route.waypoints.length} waypoints</span>
          </List.Item>
        )}
      />
    </div>
  );
}
