import { MapContainer as LeafletMapContainer, TileLayer } from 'react-leaflet';
import type { ReactNode } from 'react';
import 'leaflet/dist/leaflet.css';

const DARK_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

interface Props {
  center?: [number, number];
  zoom?: number;
  style?: React.CSSProperties;
  children?: ReactNode;
}

export default function MapContainer({
  center = [31.23, 121.47],
  zoom = 11,
  style = { width: '100%', height: '100%', minHeight: 400 },
  children,
}: Props) {
  return (
    <LeafletMapContainer center={center} zoom={zoom} style={style} scrollWheelZoom>
      <TileLayer url={DARK_TILE} attribution={ATTRIBUTION} />
      {children}
    </LeafletMapContainer>
  );
}
