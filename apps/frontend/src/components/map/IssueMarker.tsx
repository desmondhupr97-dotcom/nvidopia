import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getSeverityColor } from './drivingModeColors';
import type { IssueLocation } from '../../api/client';

interface Props {
  issue: IssueLocation;
}

function createIssueIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="28" viewBox="0 0 20 28"><path d="M10 0C4.5 0 0 4.5 0 10c0 7.5 10 18 10 18s10-10.5 10-18C20 4.5 15.5 0 10 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/><circle cx="10" cy="10" r="4" fill="#fff"/></svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [20, 28],
    iconAnchor: [10, 28],
    popupAnchor: [0, -28],
  });
}

export default function IssueMarker({ issue }: Props) {
  if (!issue.location?.lat || !issue.location?.lng) return null;

  const color = getSeverityColor(issue.severity);
  return (
    <Marker position={[issue.location.lat, issue.location.lng]} icon={createIssueIcon(color)}>
      <Popup>
        <div style={{ fontSize: 12, lineHeight: 1.6, color: '#fff', minWidth: 160 }}>
          <strong>{issue.issue_id}</strong><br />
          Category: {issue.category ?? '—'}<br />
          Severity: <span style={{ color }}>{issue.severity}</span><br />
          {issue.description && <span>{issue.description.slice(0, 80)}{issue.description.length > 80 ? '…' : ''}<br /></span>}
          {issue.triggered_at && <>Time: {new Date(issue.triggered_at).toLocaleString()}<br /></>}
          <a href={`/issues/${issue.issue_id}`} style={{ color: '#1890ff' }}>View Detail →</a>
        </div>
      </Popup>
    </Marker>
  );
}
