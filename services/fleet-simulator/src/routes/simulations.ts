import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { SimulationSession, Run, VehicleTrajectory } from '@nvidopia/data-models';
import { asyncHandler } from '@nvidopia/service-toolkit';
import { generateRoutes } from '../engine/route-generator.js';
import { generateFleet } from '../engine/fleet-generator.js';
import { sessionController } from '../engine/session-controller.js';
import { planRoadRoute, snapRoutesToRoads } from '../engine/road-router.js';

const router = Router();

function paramId(req: Request): string {
  return String(req.params.id ?? '');
}

router.get('/simulations', asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = String(req.query.status);
  const sessions = await SimulationSession.find(filter)
    .sort({ created_at: -1 })
    .lean();
  res.json(sessions);
}));

router.post('/simulations', asyncHandler(async (req: Request, res: Response) => {
  const sessionId = req.body.session_id ?? `SIM-${crypto.randomUUID().slice(0, 8)}`;
  const session = await SimulationSession.create({
    session_id: sessionId,
    name: req.body.name || `Simulation ${sessionId}`,
    status: 'Draft',
    fleet_config: req.body.fleet_config || { mode: 'random', vehicle_count: 5 },
    route_config: req.body.route_config || {
      mode: 'random',
      random_config: { start_point: { lat: 31.2304, lng: 121.4737 }, radius_km: 10, min_waypoints: 5, max_waypoints: 15 },
    },
    report_config: req.body.report_config || {
      telemetry_interval_ms: 3000,
      issue_interval_range_ms: [30000, 120000],
      status_change_interval_ms: 60000,
      speed_range_mps: [8, 33],
    },
    assignments: req.body.assignments || [],
  });
  res.status(201).json(session);
}));

router.get('/simulations/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = paramId(req);
  const session = await SimulationSession.findOne({ session_id: id }).lean();
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  const liveStats = sessionController.getLiveStats(id);
  res.json({ ...session, ...(liveStats ? { live_stats: liveStats } : {}) });
}));

router.put('/simulations/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = paramId(req);
  const { session_id, ...update } = req.body;
  const session = await SimulationSession.findOneAndUpdate(
    { session_id: id, status: 'Draft' },
    { $set: update },
    { new: true, runValidators: true },
  );
  if (!session) { res.status(404).json({ error: 'Session not found or not in Draft status' }); return; }
  res.json(session);
}));

router.delete('/simulations/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = paramId(req);
  await sessionController.stop(id);
  const session = await SimulationSession.findOneAndDelete({ session_id: id });
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  res.json({ deleted: true, session_id: id });
}));

router.post('/simulations/:id/start', asyncHandler(async (req: Request, res: Response) => {
  const id = paramId(req);
  const session = await SimulationSession.findOne({ session_id: id });
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  if (session.status !== 'Draft' && session.status !== 'Paused') {
    res.status(400).json({ error: `Cannot start session in ${session.status} status` });
    return;
  }
  await sessionController.start(session);
  session.status = 'Running';
  session.started_at = session.started_at ?? new Date();
  await session.save();
  res.json({ started: true, session_id: id });
}));

router.post('/simulations/:id/pause', asyncHandler(async (req: Request, res: Response) => {
  const id = paramId(req);
  const session = await SimulationSession.findOne({ session_id: id });
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  if (session.status !== 'Running') {
    res.status(400).json({ error: 'Session is not running' });
    return;
  }
  sessionController.pause(id);
  session.status = 'Paused';
  await session.save();
  res.json({ paused: true, session_id: id });
}));

router.post('/simulations/:id/resume', asyncHandler(async (req: Request, res: Response) => {
  const id = paramId(req);
  const session = await SimulationSession.findOne({ session_id: id });
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  if (session.status !== 'Paused') {
    res.status(400).json({ error: 'Session is not paused' });
    return;
  }
  await sessionController.start(session);
  session.status = 'Running';
  await session.save();
  res.json({ resumed: true, session_id: id });
}));

router.post('/simulations/:id/stop', asyncHandler(async (req: Request, res: Response) => {
  const id = paramId(req);
  const session = await SimulationSession.findOne({ session_id: id });
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  const stats = await sessionController.stop(id);
  session.status = 'Completed';
  session.stopped_at = new Date();
  if (stats) {
    session.stats = { ...session.stats, ...stats };
  }
  await session.save();
  res.json({ stopped: true, session_id: id, stats: session.stats });
}));

router.get('/simulations/:id/stats', asyncHandler(async (req: Request, res: Response) => {
  const id = paramId(req);
  const liveStats = sessionController.getLiveStats(id);
  if (!liveStats) {
    const session = await SimulationSession.findOne({ session_id: id }).lean();
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    res.json(session.stats);
    return;
  }
  res.json(liveStats);
}));

router.get('/simulations/:id/vehicles', asyncHandler(async (req: Request, res: Response) => {
  const id = paramId(req);
  const tailSize = Math.min(Number(req.query.tail) || 30, 200);

  const runs = await Run.find({ simulation_ref: id }).lean();
  if (runs.length === 0) { res.json([]); return; }

  const vehicles = await Promise.all(
    runs.map(async (run) => {
      const points = await VehicleTrajectory.find({ run_id: run.run_id })
        .sort({ timestamp: -1 })
        .limit(tailSize)
        .lean();

      const trail = points.reverse().map((p) => ({
        lat: p.location.lat,
        lng: p.location.lng,
        speed_mps: p.speed_mps,
        heading_deg: p.heading_deg,
        driving_mode: p.driving_mode,
        timestamp: p.timestamp,
      }));

      const latest = trail[trail.length - 1];
      return {
        vin: run.vehicle_vin,
        run_id: run.run_id,
        current: latest ?? null,
        trail,
      };
    }),
  );

  res.json(vehicles);
}));

router.post('/simulations/generate-routes', asyncHandler(async (req: Request, res: Response) => {
  const { start_point, radius_km = 10, count = 5, min_waypoints = 5, max_waypoints = 15, snap_to_roads = true, target_distance_km } = req.body;
  if (!start_point?.lat || !start_point?.lng) {
    res.status(400).json({ error: 'start_point with lat/lng is required' });
    return;
  }
  const rawRoutes = generateRoutes({
    startPoint: start_point,
    radiusKm: radius_km,
    count,
    minWaypoints: min_waypoints,
    maxWaypoints: max_waypoints,
    targetDistanceKm: target_distance_km,
  });

  if (snap_to_roads) {
    const snapped = await snapRoutesToRoads(rawRoutes);
    res.json({ routes: snapped });
  } else {
    res.json({ routes: rawRoutes });
  }
}));

router.post('/simulations/generate-fleet', asyncHandler(async (req: Request, res: Response) => {
  const { count = 5, template } = req.body;
  const vehicles = generateFleet(count, template);
  res.json({ vehicles });
}));

router.post('/simulations/plan-road-route', asyncHandler(async (req: Request, res: Response) => {
  const { waypoints } = req.body;
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    res.status(400).json({ error: 'At least 2 waypoints with lat/lng are required' });
    return;
  }
  const road = await planRoadRoute(waypoints);
  res.json(road);
}));

router.post('/simulations/snap-routes', asyncHandler(async (req: Request, res: Response) => {
  const { routes } = req.body;
  if (!Array.isArray(routes) || routes.length === 0) {
    res.status(400).json({ error: 'routes array is required' });
    return;
  }
  const snapped = await snapRoutesToRoads(routes);
  res.json({ routes: snapped });
}));

export default router;
