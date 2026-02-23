import type { IGpsCoordinates } from '@nvidopia/data-models';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

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

function haversine(a: IGpsCoordinates, b: IGpsCoordinates): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
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

/**
 * Call OSRM public API to snap waypoints to actual roads and return the full
 * road geometry with per-segment distance/duration/heading.
 */
export async function planRoadRoute(waypoints: IGpsCoordinates[]): Promise<RoadRoute> {
  if (waypoints.length < 2) {
    return { coordinates: [...waypoints], segments: [], total_distance_m: 0, total_duration_s: 0 };
  }

  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=polyline6&steps=false`;

  const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) throw new Error(`OSRM returned ${resp.status}`);

  const data = await resp.json() as {
    code: string;
    routes?: Array<{
      geometry: string;
      distance: number;
      duration: number;
    }>;
  };

  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(`OSRM routing failed: ${data.code}`);
  }

  const route = data.routes[0]!;
  const coordinates = decodePoly6(route.geometry);
  const segments = buildSegments(coordinates, route.duration, route.distance);

  return {
    coordinates,
    segments,
    total_distance_m: route.distance,
    total_duration_s: route.duration,
  };
}

/**
 * Snap multiple ISimRoute waypoints to real roads. Returns new routes with
 * road-following coordinates replacing the original straight-line waypoints.
 */
export async function snapRoutesToRoads(
  routes: Array<{ route_id: string; name?: string; waypoints: IGpsCoordinates[] }>,
): Promise<Array<{ route_id: string; name?: string; waypoints: IGpsCoordinates[]; road?: RoadRoute }>> {
  const results: Array<{ route_id: string; name?: string; waypoints: IGpsCoordinates[]; road?: RoadRoute }> = [];

  for (const route of routes) {
    if (route.waypoints.length < 2) {
      results.push({ ...route });
      continue;
    }
    try {
      const road = await planRoadRoute(route.waypoints);
      results.push({
        route_id: route.route_id,
        name: route.name,
        waypoints: route.waypoints,
        road,
      });
    } catch (err) {
      console.warn(`[road-router] Failed to snap route ${route.route_id}, using raw waypoints:`, (err as Error).message);
      results.push({ ...route });
    }
  }

  return results;
}
