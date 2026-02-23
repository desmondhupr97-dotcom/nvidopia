import type { IGpsCoordinates } from '@nvidopia/data-models';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const OSRM_TIMEOUT_MS = 30_000;
const MAX_CONCURRENT = 3;
const MAX_ROAD_COORDS = 800;

export interface RoadSegment {
  from: IGpsCoordinates;
  to: IGpsCoordinates;
  distance_m: number;
  duration_s: number;
  heading_deg: number;
}

export interface RoadRoute {
  coordinates: IGpsCoordinates[];
  segments: RoadSegment[];
  total_distance_m: number;
  total_duration_s: number;
}

function decodePoly6(encoded: string): IGpsCoordinates[] {
  const coords: IGpsCoordinates[] = [];
  let idx = 0, lat = 0, lng = 0;
  while (idx < encoded.length) {
    let shift = 0, result = 0, byte: number;
    do { byte = encoded.charCodeAt(idx++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(idx++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push({ lat: lat / 1e6, lng: lng / 1e6 });
  }
  return coords;
}

function heading(a: IGpsCoordinates, b: IGpsCoordinates): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function haversine(a: IGpsCoordinates, b: IGpsCoordinates): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Downsample a coordinate array using the Ramer–Douglas–Peucker algorithm,
 * keeping the route shape but limiting point count for payload size.
 */
function downsample(coords: IGpsCoordinates[], maxPoints: number): IGpsCoordinates[] {
  if (coords.length <= maxPoints) return coords;

  const step = (coords.length - 1) / (maxPoints - 1);
  const result: IGpsCoordinates[] = [];
  for (let i = 0; i < maxPoints - 1; i++) {
    result.push(coords[Math.round(i * step)]!);
  }
  result.push(coords[coords.length - 1]!);
  return result;
}

function buildSegments(coords: IGpsCoordinates[], totalDuration: number, totalDistance: number): RoadSegment[] {
  const segments: RoadSegment[] = [];
  if (coords.length < 2) return segments;

  let sumDist = 0;
  const rawDists: number[] = [];
  for (let i = 1; i < coords.length; i++) {
    const d = haversine(coords[i - 1]!, coords[i]!);
    rawDists.push(d);
    sumDist += d;
  }

  const distScale = totalDistance > 0 && sumDist > 0 ? totalDistance / sumDist : 1;
  const durScale = totalDuration > 0 && sumDist > 0 ? totalDuration / sumDist : 0.04;

  for (let i = 0; i < rawDists.length; i++) {
    const d = rawDists[i]! * distScale;
    segments.push({
      from: coords[i]!,
      to: coords[i + 1]!,
      distance_m: d,
      duration_s: rawDists[i]! * durScale,
      heading_deg: heading(coords[i]!, coords[i + 1]!),
    });
  }
  return segments;
}

export async function planRoadRoute(waypoints: IGpsCoordinates[]): Promise<RoadRoute> {
  if (waypoints.length < 2) {
    return { coordinates: [...waypoints], segments: [], total_distance_m: 0, total_duration_s: 0 };
  }

  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=polyline6&steps=false`;

  const resp = await fetch(url, { signal: AbortSignal.timeout(OSRM_TIMEOUT_MS) });
  if (!resp.ok) throw new Error(`OSRM returned ${resp.status}`);

  const data = await resp.json() as {
    code: string;
    routes?: Array<{ geometry: string; distance: number; duration: number }>;
  };

  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(`OSRM routing failed: ${data.code}`);
  }

  const route = data.routes[0]!;
  const fullCoordinates = decodePoly6(route.geometry);
  const coordinates = downsample(fullCoordinates, MAX_ROAD_COORDS);
  const segments = buildSegments(coordinates, route.duration, route.distance);

  return {
    coordinates,
    segments,
    total_distance_m: route.distance,
    total_duration_s: route.duration,
  };
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIdx = 0;

  async function worker() {
    while (nextIdx < items.length) {
      const idx = nextIdx++;
      results[idx] = await fn(items[idx]!);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export async function snapRoutesToRoads(
  routes: Array<{ route_id: string; name?: string; waypoints: IGpsCoordinates[] }>,
): Promise<Array<{ route_id: string; name?: string; waypoints: IGpsCoordinates[]; road?: RoadRoute }>> {
  return runWithConcurrency(routes, MAX_CONCURRENT, async (route) => {
    if (route.waypoints.length < 2) {
      return { ...route };
    }
    try {
      const road = await planRoadRoute(route.waypoints);
      return { route_id: route.route_id, name: route.name, waypoints: route.waypoints, road };
    } catch (err) {
      console.warn(`[road-router] Failed to snap route ${route.route_id}:`, (err as Error).message);
      return { ...route };
    }
  });
}
