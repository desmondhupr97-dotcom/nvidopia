import crypto from 'node:crypto';
import type { IGpsCoordinates, ISimVehicle, IReportConfig } from '@nvidopia/data-models';
import { Issue, Run, Vehicle, VehicleTrajectory, VehicleStatusSegment } from '@nvidopia/data-models';
import type { RoadRoute } from './road-router.js';
import { haversineDistance, bearingBetween } from './route-generator.js';

const DRIVING_MODES = ['Manual', 'ACC', 'LCC', 'HighwayPilot', 'UrbanPilot'] as const;
const ISSUE_CATEGORIES = ['Perception', 'Prediction', 'Planning', 'Chassis', 'System', 'Other'] as const;
const ISSUE_SEVERITIES = ['Low', 'Medium', 'High', 'Blocker'] as const;
const TAKEOVER_TYPES = ['Manual', 'SystemFault', 'Environmental', 'Other'] as const;
const ISSUE_STATUSES_FOR_CREATE = ['New', 'Triage'] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

export interface VehicleRunnerConfig {
  vehicle: ISimVehicle;
  waypoints: IGpsCoordinates[];
  road?: RoadRoute;
  reportConfig: IReportConfig;
  runId: string;
  taskId: string;
  projectId: string;
}

export interface VehicleRunnerStats {
  telemetrySent: number;
  issuesSent: number;
  mileageKm: number;
}

interface PointMeta {
  pos: IGpsCoordinates;
  heading_deg: number;
  curvature: number;
  segment_speed_mps: number;
  cumulative_dist_m: number;
}

export class VehicleRunner {
  private config: VehicleRunnerConfig;
  private points: PointMeta[] = [];
  private posIndex = 0;
  private currentMode = pick(DRIVING_MODES);
  private stats: VehicleRunnerStats = { telemetrySent: 0, issuesSent: 0, mileageKm: 0 };
  private telemetryTimer: ReturnType<typeof setInterval> | null = null;
  private issueTimer: ReturnType<typeof setTimeout> | null = null;
  private modeTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;

  private prevSpeed = 0;
  private prevHeading = 0;

  constructor(config: VehicleRunnerConfig) {
    this.config = config;
    this.points = this.buildPointMeta();
  }

  start(): void {
    this.stopped = false;
    this.startTelemetry();
    this.scheduleNextIssue();
    this.startModeSwitch();
    this.writeVehicleStatus('Active');
  }

  pause(): void { this.clearTimers(); }

  async stop(): Promise<VehicleRunnerStats> {
    this.stopped = true;
    this.clearTimers();
    await this.writeVehicleStatus('Idle');
    return { ...this.stats };
  }

  getStats(): VehicleRunnerStats { return { ...this.stats }; }

  // ── Build point metadata from road geometry ─────────────────────────

  private buildPointMeta(): PointMeta[] {
    const coords = this.config.road?.coordinates ?? this.config.waypoints;
    if (coords.length < 2) {
      return coords.map((c) => ({
        pos: c, heading_deg: 0, curvature: 0,
        segment_speed_mps: (this.config.reportConfig.speed_range_mps[0] + this.config.reportConfig.speed_range_mps[1]) / 2,
        cumulative_dist_m: 0,
      }));
    }

    const segments = this.config.road?.segments;
    const [minSpd, maxSpd] = this.config.reportConfig.speed_range_mps;
    const result: PointMeta[] = [];
    let cumDist = 0;

    for (let i = 0; i < coords.length; i++) {
      const prev = coords[Math.max(0, i - 1)]!;
      const curr = coords[i]!;
      const next = coords[Math.min(coords.length - 1, i + 1)]!;

      const hIn = i > 0 ? bearingBetween(prev, curr) : bearingBetween(curr, next);
      const hOut = i < coords.length - 1 ? bearingBetween(curr, next) : hIn;
      const headingChange = Math.abs(angleDiff(hIn, hOut));

      const curvature = clamp(headingChange / 90, 0, 1);
      const curveSlowdown = 1 - curvature * 0.7;
      const baseSpeed = minSpd + (maxSpd - minSpd) * curveSlowdown;
      const jitter = randBetween(-1, 1);
      const speed = clamp(baseSpeed + jitter, minSpd, maxSpd);

      if (i > 0) {
        const seg = segments?.[i - 1];
        cumDist += seg ? seg.distance_m : haversineDistance(prev, curr) * 1000;
      }

      result.push({
        pos: curr,
        heading_deg: (hIn + hOut) / 2 % 360,
        curvature,
        segment_speed_mps: speed,
        cumulative_dist_m: cumDist,
      });
    }

    return result;
  }

  // ── Timers ──────────────────────────────────────────────────────────

  private clearTimers(): void {
    if (this.telemetryTimer) { clearInterval(this.telemetryTimer); this.telemetryTimer = null; }
    if (this.issueTimer) { clearTimeout(this.issueTimer); this.issueTimer = null; }
    if (this.modeTimer) { clearInterval(this.modeTimer); this.modeTimer = null; }
  }

  private startTelemetry(): void {
    this.telemetryTimer = setInterval(() => {
      if (this.stopped) return;
      this.writeTelemetry();
    }, this.config.reportConfig.telemetry_interval_ms);
  }

  private startModeSwitch(): void {
    this.modeTimer = setInterval(() => {
      if (this.stopped) return;
      const idx = DRIVING_MODES.indexOf(this.currentMode as typeof DRIVING_MODES[number]);
      this.currentMode = DRIVING_MODES[(idx + 1) % DRIVING_MODES.length]!;
    }, this.config.reportConfig.status_change_interval_ms);
  }

  private scheduleNextIssue(): void {
    const [min, max] = this.config.reportConfig.issue_interval_range_ms;
    this.issueTimer = setTimeout(() => {
      if (this.stopped) return;
      this.writeIssue();
      this.scheduleNextIssue();
    }, randBetween(min, max));
  }

  // ── Position & dynamics ─────────────────────────────────────────────

  private advance(): PointMeta {
    if (this.points.length === 0) {
      return { pos: { lat: 0, lng: 0 }, heading_deg: 0, curvature: 0, segment_speed_mps: 0, cumulative_dist_m: 0 };
    }
    const pt = this.points[this.posIndex % this.points.length]!;
    this.posIndex = (this.posIndex + 1) % this.points.length;
    return pt;
  }

  private computeDynamics(pt: PointMeta): {
    speed_mps: number;
    acceleration_mps2: number;
    lateral_acceleration_mps2: number;
    yaw_rate_dps: number;
    heading_deg: number;
    steering_angle_deg: number;
    throttle_pct: number;
    brake_pressure_bar: number;
  } {
    const dt = this.config.reportConfig.telemetry_interval_ms / 1000;
    const speed = pt.segment_speed_mps;
    const rawAccel = (speed - this.prevSpeed) / dt;
    const acceleration = clamp(rawAccel, -4, 3);
    const headingDelta = angleDiff(this.prevHeading, pt.heading_deg);
    const yawRate = dt > 0 ? headingDelta / dt : 0;
    const lateralAccel = speed * speed * pt.curvature * 0.01 * Math.sign(headingDelta);
    const steeringAngle = clamp(headingDelta * 0.8, -35, 35);
    const throttle = acceleration >= 0 ? clamp(acceleration / 3 * 100, 0, 100) : 0;
    const brake = acceleration < 0 ? clamp(-acceleration / 4 * 80, 0, 80) : 0;

    this.prevSpeed = speed;
    this.prevHeading = pt.heading_deg;

    return {
      speed_mps: Number(speed.toFixed(2)),
      acceleration_mps2: Number(acceleration.toFixed(2)),
      lateral_acceleration_mps2: Number(clamp(lateralAccel, -6, 6).toFixed(2)),
      yaw_rate_dps: Number(clamp(yawRate, -30, 30).toFixed(2)),
      heading_deg: Number(pt.heading_deg.toFixed(1)),
      steering_angle_deg: Number(steeringAngle.toFixed(1)),
      throttle_pct: Number(throttle.toFixed(0)),
      brake_pressure_bar: Number(brake.toFixed(1)),
    };
  }

  // ── Direct MongoDB writes (replaces Kafka pipeline) ─────────────────

  private async writeTelemetry(): Promise<void> {
    const pt = this.advance();
    const dynamics = this.computeDynamics(pt);

    let mileageDelta = 0;
    if (this.posIndex > 1 && this.points.length > 1) {
      const prevPt = this.points[(this.posIndex - 2 + this.points.length) % this.points.length]!;
      mileageDelta = haversineDistance(prevPt.pos, pt.pos);
      this.stats.mileageKm += mileageDelta;
    }

    const vin = this.config.vehicle.vin;
    const ts = new Date();

    try {
      // 1. Write trajectory point
      await VehicleTrajectory.create({
        vin,
        run_id: this.config.runId,
        timestamp: ts,
        location: { lat: pt.pos.lat, lng: pt.pos.lng },
        speed_mps: dynamics.speed_mps,
        driving_mode: this.currentMode,
        heading_deg: dynamics.heading_deg,
      });

      // 2. Update Vehicle real-time fields
      await Vehicle.findOneAndUpdate(
        { vin },
        {
          $set: {
            last_heartbeat: ts,
            current_location: { lat: pt.pos.lat, lng: pt.pos.lng },
            current_speed_mps: dynamics.speed_mps,
            driving_mode: this.currentMode,
          },
        },
      );

      // 3. Update Run mileage
      if (mileageDelta > 0) {
        await Run.updateOne(
          { run_id: this.config.runId },
          { $inc: { total_auto_mileage_km: mileageDelta } },
        );
      }

      // 4. Handle driving-mode status segments
      await this.updateStatusSegment(vin, this.currentMode, ts, mileageDelta);

      this.stats.telemetrySent++;
    } catch (err) {
      console.error(`[vehicle-runner] telemetry write error for ${vin}:`, (err as Error).message);
    }
  }

  private async updateStatusSegment(vin: string, drivingMode: string, ts: Date, mileageDelta: number): Promise<void> {
    const openSegment = await VehicleStatusSegment.findOne({ vin, end_time: null }).sort({ start_time: -1 });

    if (openSegment && openSegment.driving_mode !== drivingMode) {
      const durationMs = ts.getTime() - new Date(openSegment.start_time).getTime();
      await VehicleStatusSegment.updateOne(
        { _id: openSegment._id },
        { $set: { end_time: ts, duration_ms: durationMs }, $inc: { mileage_km: mileageDelta } },
      );
      await VehicleStatusSegment.create({
        vin,
        run_id: this.config.runId,
        driving_mode: drivingMode,
        start_time: ts,
        mileage_km: 0,
      });
    } else if (openSegment) {
      if (mileageDelta > 0) {
        await VehicleStatusSegment.updateOne(
          { _id: openSegment._id },
          { $inc: { mileage_km: mileageDelta } },
        );
      }
    } else {
      await VehicleStatusSegment.create({
        vin,
        run_id: this.config.runId,
        driving_mode: drivingMode,
        start_time: ts,
        mileage_km: mileageDelta > 0 ? mileageDelta : 0,
      });
    }
  }

  private async writeIssue(): Promise<void> {
    const pt = this.advance();
    const dynamics = this.computeDynamics(pt);
    const issueId = `ISS-${crypto.randomUUID().slice(0, 8)}`;

    try {
      await Issue.create({
        issue_id: issueId,
        run_id: this.config.runId,
        trigger_timestamp: new Date(),
        gps_coordinates: { lat: pt.pos.lat, lng: pt.pos.lng },
        category: pick(ISSUE_CATEGORIES),
        severity: pick(ISSUE_SEVERITIES),
        takeover_type: pick(TAKEOVER_TYPES),
        data_snapshot_url: `sim://snapshot/${this.config.vehicle.vin}/${Date.now()}`,
        environment_tags: ['simulation'],
        description: `[SIM] Auto-generated issue from vehicle ${this.config.vehicle.vin}`,
        status: pick(ISSUE_STATUSES_FOR_CREATE),
        vehicle_dynamics: dynamics,
      });

      this.stats.issuesSent++;
    } catch (err) {
      console.error(`[vehicle-runner] issue write error:`, (err as Error).message);
    }
  }

  private async writeVehicleStatus(status: string): Promise<void> {
    const pt = this.points[this.posIndex % Math.max(1, this.points.length)];
    const pos = pt?.pos ?? { lat: 0, lng: 0 };
    const vin = this.config.vehicle.vin;

    try {
      await Vehicle.findOneAndUpdate(
        { vin },
        {
          $set: {
            current_status: status,
            last_heartbeat: new Date(),
            driving_mode: this.currentMode,
            current_location: { lat: pos.lat, lng: pos.lng },
            fuel_or_battery_level: Math.floor(randBetween(20, 100)),
          },
        },
        { upsert: true },
      );
    } catch (err) {
      console.error(`[vehicle-runner] status write error for ${vin}:`, (err as Error).message);
    }
  }
}
