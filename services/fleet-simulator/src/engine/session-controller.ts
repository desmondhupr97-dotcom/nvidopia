import crypto from 'node:crypto';
import { Project, Task, Run, Vehicle, type SimulationSessionDocument, type ISimVehicle } from '@nvidopia/data-models';
import { generateFleet } from './fleet-generator.js';
import { generateRoutes } from './route-generator.js';
import { VehicleRunner, type VehicleRunnerStats } from './vehicle-runner.js';

const BFF_BASE_URL = process.env.BFF_URL || 'http://localhost:3000';

interface ActiveSession {
  sessionId: string;
  runners: VehicleRunner[];
}

class SessionController {
  private activeSessions = new Map<string, ActiveSession>();

  async start(session: SimulationSessionDocument): Promise<void> {
    if (this.activeSessions.has(session.session_id)) return;

    const vehicles = await this.resolveVehicles(session);
    const routes = await this.resolveRoutes(session, vehicles.length);
    const assignments = await this.resolveAssignments(session, vehicles, routes);

    const runners: VehicleRunner[] = [];

    for (const assignment of assignments) {
      const vehicle = vehicles.find((v) => v.vin === assignment.vin);
      if (!vehicle) continue;

      const route = routes.find((r) => r.route_id === assignment.route_id);
      const waypoints = route?.waypoints ?? routes[0]?.waypoints ?? [{ lat: 31.23, lng: 121.47 }];

      const runner = new VehicleRunner({
        vehicle,
        waypoints,
        reportConfig: session.report_config,
        runId: assignment.runId,
        taskId: assignment.task_id,
        projectId: assignment.project_id,
        ingestBaseUrl: BFF_BASE_URL,
      });

      runner.start();
      runners.push(runner);
    }

    this.activeSessions.set(session.session_id, { sessionId: session.session_id, runners });
  }

  pause(sessionId: string): void {
    const active = this.activeSessions.get(sessionId);
    if (!active) return;
    for (const runner of active.runners) runner.pause();
  }

  async stop(sessionId: string): Promise<{ telemetry_sent: number; issues_sent: number; total_mileage_km: number } | null> {
    const active = this.activeSessions.get(sessionId);
    if (!active) return null;

    let totalTelemetry = 0;
    let totalIssues = 0;
    let totalMileage = 0;

    for (const runner of active.runners) {
      const stats = await runner.stop();
      totalTelemetry += stats.telemetrySent;
      totalIssues += stats.issuesSent;
      totalMileage += stats.mileageKm;
    }

    this.activeSessions.delete(sessionId);
    return { telemetry_sent: totalTelemetry, issues_sent: totalIssues, total_mileage_km: totalMileage };
  }

  getLiveStats(sessionId: string): { telemetry_sent: number; issues_sent: number; total_mileage_km: number; vehicle_count: number } | null {
    const active = this.activeSessions.get(sessionId);
    if (!active) return null;

    let t = 0, i = 0, m = 0;
    for (const runner of active.runners) {
      const s = runner.getStats();
      t += s.telemetrySent;
      i += s.issuesSent;
      m += s.mileageKm;
    }

    return { telemetry_sent: t, issues_sent: i, total_mileage_km: m, vehicle_count: active.runners.length };
  }

  private async resolveVehicles(session: SimulationSessionDocument): Promise<ISimVehicle[]> {
    const fc = session.fleet_config;
    let vehicles: ISimVehicle[];

    if (fc.mode === 'custom' && fc.vehicles && fc.vehicles.length > 0) {
      vehicles = fc.vehicles;
    } else {
      vehicles = generateFleet(fc.vehicle_count, fc.vehicle_template ?? undefined);
    }

    for (const v of vehicles) {
      await Vehicle.findOneAndUpdate(
        { vin: v.vin },
        {
          $set: {
            vin: v.vin,
            plate_type: v.plate_type,
            model_code: v.model_code,
            vehicle_platform: v.vehicle_platform,
            sensor_suite_version: v.sensor_suite_version,
            soc_architecture: v.soc_architecture,
            current_status: 'Idle',
          },
        },
        { upsert: true },
      );
    }

    return vehicles;
  }

  private async resolveRoutes(session: SimulationSessionDocument, vehicleCount: number) {
    const rc = session.route_config;
    if (rc.mode === 'custom' && rc.routes && rc.routes.length > 0) {
      return rc.routes;
    }
    const cfg = rc.random_config ?? {
      start_point: { lat: 31.2304, lng: 121.4737 },
      radius_km: 10,
      min_waypoints: 5,
      max_waypoints: 15,
    };
    return generateRoutes({
      startPoint: cfg.start_point,
      radiusKm: cfg.radius_km,
      count: vehicleCount,
      minWaypoints: cfg.min_waypoints,
      maxWaypoints: cfg.max_waypoints,
    });
  }

  private async resolveAssignments(
    session: SimulationSessionDocument,
    vehicles: ISimVehicle[],
    routes: Array<{ route_id: string; waypoints: Array<{ lat: number; lng: number }> }>,
  ): Promise<Array<{ vin: string; project_id: string; task_id: string; route_id: string; runId: string }>> {
    if (session.assignments && session.assignments.length > 0) {
      const result: Array<{ vin: string; project_id: string; task_id: string; route_id: string; runId: string }> = [];
      for (const a of session.assignments) {
        const runId = `RUN-SIM-${crypto.randomUUID().slice(0, 8)}`;
        await Run.create({
          run_id: runId,
          task_id: a.task_id,
          vehicle_vin: a.vin,
          status: 'Active',
          start_time: new Date(),
          simulation_ref: session.session_id,
          simulation_status: 'active',
        });
        result.push({
          vin: a.vin,
          project_id: a.project_id,
          task_id: a.task_id,
          route_id: a.route_id || routes[result.length % routes.length]?.route_id || '',
          runId,
        });
      }
      return result;
    }

    const projectId = `SIM-${session.session_id}`;
    const taskId = `SIM-TASK-${session.session_id}`;

    await Project.findOneAndUpdate(
      { project_id: projectId },
      {
        $set: {
          project_id: projectId,
          name: `[Simulation] ${session.name}`,
          vehicle_platform: vehicles[0]?.vehicle_platform ?? 'SIM',
          soc_architecture: vehicles[0]?.soc_architecture ?? 'SIM',
          sensor_suite_version: vehicles[0]?.sensor_suite_version ?? 'SIM',
          software_baseline_version: 'SIM-v1.0',
          status: 'Active',
          start_date: new Date(),
        },
      },
      { upsert: true },
    );

    await Task.findOneAndUpdate(
      { task_id: taskId },
      {
        $set: {
          task_id: taskId,
          project_id: projectId,
          name: `[Simulation] ${session.name} - Daily`,
          task_type: 'Daily',
          priority: 'Medium',
          status: 'InProgress',
        },
      },
      { upsert: true },
    );

    const result: Array<{ vin: string; project_id: string; task_id: string; route_id: string; runId: string }> = [];
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i]!;
      const runId = `RUN-SIM-${crypto.randomUUID().slice(0, 8)}`;
      await Run.create({
        run_id: runId,
        task_id: taskId,
        vehicle_vin: v.vin,
        status: 'Active',
        start_time: new Date(),
        simulation_ref: session.session_id,
        simulation_status: 'active',
      });
      result.push({
        vin: v.vin,
        project_id: projectId,
        task_id: taskId,
        route_id: routes[i % routes.length]?.route_id || '',
        runId,
      });
    }

    return result;
  }
}

export const sessionController = new SessionController();
