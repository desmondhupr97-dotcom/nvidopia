import { Polyline, Tooltip } from 'react-leaflet';
import type { TrajectoryPoint } from '../../api/client';
import { getDrivingModeColor } from './drivingModeColors';

interface Props {
  points: TrajectoryPoint[];
}

interface Segment {
  mode: string;
  positions: [number, number][];
  startTime?: string;
  endTime?: string;
  avgSpeed: number;
}

function buildSegments(points: TrajectoryPoint[]): Segment[] {
  const first = points[0];
  if (!first) return [];

  const segments: Segment[] = [];
  let currentMode = first.driving_mode;
  let positions: [number, number][] = [[first.location.lat, first.location.lng]];
  let speedSum = first.speed_mps;
  let startTime = first.timestamp;

  for (let i = 1; i < points.length; i++) {
    const pt = points[i]!;
    const prev = points[i - 1]!;
    if (pt.driving_mode !== currentMode) {
      segments.push({
        mode: currentMode,
        positions: [...positions],
        startTime,
        endTime: prev.timestamp,
        avgSpeed: speedSum / positions.length,
      });
      currentMode = pt.driving_mode;
      positions = [[prev.location.lat, prev.location.lng]];
      speedSum = 0;
      startTime = pt.timestamp;
    }
    positions.push([pt.location.lat, pt.location.lng]);
    speedSum += pt.speed_mps;
  }

  const last = points[points.length - 1]!;
  segments.push({
    mode: currentMode,
    positions,
    startTime,
    endTime: last.timestamp,
    avgSpeed: speedSum / positions.length,
  });

  return segments;
}

export default function TrajectoryPolyline({ points }: Props) {
  const segments = buildSegments(points);

  return (
    <>
      {segments.map((seg, i) => (
        <Polyline
          key={i}
          positions={seg.positions}
          pathOptions={{ color: getDrivingModeColor(seg.mode), weight: 3, opacity: 0.85 }}
        >
          <Tooltip sticky>
            <div style={{ fontSize: 11, lineHeight: 1.5 }}>
              <strong>{seg.mode}</strong><br />
              Avg speed: {seg.avgSpeed.toFixed(1)} m/s<br />
              {seg.startTime && new Date(seg.startTime).toLocaleTimeString()}
              {' → '}
              {seg.endTime && new Date(seg.endTime).toLocaleTimeString()}
            </div>
          </Tooltip>
        </Polyline>
      ))}
    </>
  );
}
