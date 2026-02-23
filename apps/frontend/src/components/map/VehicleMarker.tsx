import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getDrivingModeColor } from './drivingModeColors';

interface Props {
  vin: string;
  lat: number;
  lng: number;
  drivingMode?: string;
  speed?: number;
  heading?: number;
  onClick?: () => void;
}

function createVehicleIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${color}" stroke="#fff" stroke-width="2" opacity="0.9"/><circle cx="12" cy="12" r="4" fill="#fff"/></svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export default function VehicleMarker({ vin, lat, lng, drivingMode, speed, onClick }: Props) {
  const color = getDrivingModeColor(drivingMode ?? 'Manual');
  return (
    <Marker position={[lat, lng]} icon={createVehicleIcon(color)} eventHandlers={{ click: onClick }}>
      <Popup>
        <div style={{ fontSize: 12, lineHeight: 1.6, color: '#fff', minWidth: 120 }}>
          <strong>{vin}</strong><br />
          Mode: {drivingMode ?? '—'}<br />
          Speed: {speed != null ? `${speed.toFixed(1)} m/s` : '—'}
        </div>
      </Popup>
    </Marker>
  );
}
