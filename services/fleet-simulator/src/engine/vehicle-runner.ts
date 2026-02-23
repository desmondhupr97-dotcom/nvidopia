import type { IGpsCoordinates, ISimVehicle, IReportConfig } from '@nvidopia/data-models';
import type { RoadRoute, RoadSegment } from './road-router.js';
import { haversineDistance, bearingBetween } from './route-generator.js';

const DRIVING_MODES = ['Manual', 'ACC', 'LCC', 'HighwayPilot', 'UrbanPilot'] as const;
const ISSUE_CATEGORIES = ['Perception', 'Prediction', 'Planning', 'Chassis', 'System', 'Other'] as const;
const ISSUE_SEVERITIES = ['Low', 'Medium', 'High', 'Blocker'] as const;
const TAKEOVER_TYPES = ['Manual', 'SystemFault', 'Environmental', 'Other'] as const;

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
  ingestBaseUrl: string;
}

export interface VehicleRunnerStats {
  telemetrySent: number;
  issuesSent: number;
  mileageKm: number;
}

/**
 * Precomputed per-point metadata used by the dynamics model to produce
 * realistic speed, acceleration, and yaw data along a road-based route.
 */
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
    this.sendStatus('Active');
  }

  pause(): void { this.clearTimers(); }

  async stop(): Promise<VehicleRunnerStats> {
    this.stopped = true;
    this.clearTimers();
    await this.sendStatus('Idle');
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

      // curvature: 0 = straight, 1 = sharp turn (≥90°)
      const curvature = clamp(headingChange / 90, 0, 1);

      // Speed model: fast on straight, slow on curves
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
      this.emitTelemetry();
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
      this.emitIssue();
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

    // Smooth acceleration (avoid jumps)
    const rawAccel = (speed - this.prevSpeed) / dt;
    const acceleration = clamp(rawAccel, -4, 3);

    // Heading-based yaw rate
    const headingDelta = angleDiff(this.prevHeading, pt.heading_deg);
    const yawRate = dt > 0 ? headingDelta / dt : 0;

    // Lateral acceleration from curvature: a_lat = v² / R ≈ v² * κ
    const lateralAccel = speed * speed * pt.curvature * 0.01 * Math.sign(headingDelta);

    // Steering angle ~ proportional to curvature
    const steeringAngle = clamp(headingDelta * 0.8, -35, 35);

    // Throttle/brake from longitudinal acceleration
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

  // ── Telemetry emission ──────────────────────────────────────────────

  private async emitTelemetry(): Promise<void> {
    const pt = this.advance();
    const dynamics = this.computeDynamics(pt);

    // Mileage from actual road distance between adjacent points
    if (this.posIndex > 1 && this.points.length > 1) {
      const prevPt = this.points[(this.posIndex - 2 + this.points.length) % this.points.length]!;
      const distKm = haversineDistance(prevPt.pos, pt.pos);
      this.stats.mileageKm += distKm;
    }

    const payload = {
      vehicle_id: this.config.vehicle.vin,
      timestamp: new Date().toISOString(),
      lat: pt.pos.lat,
      lng: pt.pos.lng,
      speed_mps: dynamics.speed_mps,
      heading_deg: dynamics.heading_deg,
      mileage_km: Number((this.stats.mileageKm).toFixed(4)),
      driving_mode: this.currentMode,
      acceleration_mps2: dynamics.acceleration_mps2,
      yaw_rate_dps: dynamics.yaw_rate_dps,
    };

    try {
      await fetch(`${this.config.ingestBaseUrl}/api/ingest/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      this.stats.telemetrySent++;
    } catch { /* ignore network errors */ }
  }

  private async emitIssue(): Promise<void> {
    const pt = this.advance();
    const dynamics = this.computeDynamics(pt);

    const payload = {
      run_id: this.config.runId,
      project_id: this.config.projectId,
      task_id: this.config.taskId,
      trigger_timestamp: new Date().toISOString(),
      gps_lat: pt.pos.lat,
      gps_lng: pt.pos.lng,
      category: pick(ISSUE_CATEGORIES),
      severity: pick(ISSUE_SEVERITIES),
      takeover_type: pick(TAKEOVER_TYPES),
      data_snapshot_uri: `sim://snapshot/${this.config.vehicle.vin}/${Date.now()}`,
      environment_tags: ['simulation'],
      description: `[SIM] Auto-generated issue from vehicle ${this.config.vehicle.vin}`,
      vehicle_dynamics: dynamics,
    };

    try {
      await fetch(`${this.config.ingestBaseUrl}/api/ingest/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      this.stats.issuesSent++;
    } catch { /* ignore */ }
  }

  private async sendStatus(status: string): Promise<void> {
    const pt = this.points[this.posIndex % Math.max(1, this.points.length)];
    const pos = pt?.pos ?? { lat: 0, lng: 0 };
    const payload = {
      vehicle_id: this.config.vehicle.vin,
      timestamp: new Date().toISOString(),
      status,
      software_version: 'SIM-v1.0',
      hardware_version: 'SIM-HW-1.0',
      fuel_or_battery_level: Math.floor(randBetween(20, 100)),
      driving_mode: this.currentMode,
      lat: pos.lat,
      lng: pos.lng,
    };

    try {
      await fetch(`${this.config.ingestBaseUrl}/api/ingest/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch { /* ignore */ }
  }
}
