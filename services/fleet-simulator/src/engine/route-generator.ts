import type { IGpsCoordinates, ISimRoute } from '@nvidopia/data-models';
import crypto from 'node:crypto';

const EARTH_RADIUS_KM = 6371;

export function haversineDistance(a: IGpsCoordinates, b: IGpsCoordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function destinationPoint(origin: IGpsCoordinates, bearingDeg: number, distanceKm: number): IGpsCoordinates {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const angularDist = distanceKm / EARTH_RADIUS_KM;
  const bearing = toRad(bearingDeg);
  const lat1 = toRad(origin.lat);
  const lng1 = toRad(origin.lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDist) +
    Math.cos(lat1) * Math.sin(angularDist) * Math.cos(bearing),
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDist) * Math.cos(lat1),
    Math.cos(angularDist) - Math.sin(lat1) * Math.sin(lat2),
  );

  return { lat: toDeg(lat2), lng: toDeg(lng2) };
}

export function bearingBetween(a: IGpsCoordinates, b: IGpsCoordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
            Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Generate a single route with realistic road-like waypoints.
 * Starts from the given point, picks a random initial heading,
 * then varies heading within +-60 deg at each step to avoid
 * sharp reversals while keeping points within the radius.
 */
function generateSingleRoute(
  startPoint: IGpsCoordinates,
  radiusKm: number,
  waypointCount: number,
): IGpsCoordinates[] {
  const waypoints: IGpsCoordinates[] = [startPoint];
  let heading = Math.random() * 360;
  const stepKm = radiusKm / (waypointCount * 0.6);

  for (let i = 1; i < waypointCount; i++) {
    heading = (heading + randBetween(-60, 60) + 360) % 360;
    const dist = stepKm * randBetween(0.5, 1.5);
    const candidate = destinationPoint(waypoints[waypoints.length - 1]!, heading, dist);

    if (haversineDistance(startPoint, candidate) > radiusKm) {
      heading = bearingBetween(candidate, startPoint) + randBetween(-30, 30);
      const fallback = destinationPoint(waypoints[waypoints.length - 1]!, heading, dist * 0.5);
      waypoints.push(fallback);
    } else {
      waypoints.push(candidate);
    }
  }

  return waypoints;
}

/**
 * Interpolate additional points between waypoints for smooth GPS trails.
 * Returns points spaced approximately `stepKm` apart.
 */
export function interpolateRoute(waypoints: IGpsCoordinates[], stepKm: number): IGpsCoordinates[] {
  if (waypoints.length < 2) return [...waypoints];
  const result: IGpsCoordinates[] = [waypoints[0]!];

  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1]!;
    const next = waypoints[i]!;
    const dist = haversineDistance(prev, next);
    const steps = Math.max(1, Math.floor(dist / stepKm));
    const bearing = bearingBetween(prev, next);

    for (let s = 1; s <= steps; s++) {
      const frac = s / steps;
      result.push(destinationPoint(prev, bearing, dist * frac));
    }
  }

  return result;
}

export interface GenerateRoutesOptions {
  startPoint: IGpsCoordinates;
  radiusKm: number;
  count: number;
  minWaypoints: number;
  maxWaypoints: number;
}

export function generateRoutes(opts: GenerateRoutesOptions): ISimRoute[] {
  const routes: ISimRoute[] = [];
  for (let i = 0; i < opts.count; i++) {
    const wpCount = Math.floor(randBetween(opts.minWaypoints, opts.maxWaypoints + 1));
    const waypoints = generateSingleRoute(opts.startPoint, opts.radiusKm, wpCount);
    routes.push({
      route_id: `ROUTE-${crypto.randomUUID().slice(0, 8)}`,
      name: `Route ${i + 1}`,
      waypoints,
    });
  }
  return routes;
}
