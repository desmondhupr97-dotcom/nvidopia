import type { IGpsCoordinates, ISimVehicle, IReportConfig } from '@nvidopia/data-models';
import { haversineDistance, interpolateRoute, bearingBetween } from './route-generator.js';

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

export interface VehicleRunnerConfig {
  vehicle: ISimVehicle;
  waypoints: IGpsCoordinates[];
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

export class VehicleRunner {
  private config: VehicleRunnerConfig;
  private interpolated: IGpsCoordinates[] = [];
  private posIndex = 0;
  private currentMode = pick(DRIVING_MODES);
  private stats: VehicleRunnerStats = { telemetrySent: 0, issuesSent: 0, mileageKm: 0 };
  private telemetryTimer: ReturnType<typeof setInterval> | null = null;
  private issueTimer: ReturnType<typeof setTimeout> | null = null;
  private modeTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;

  constructor(config: VehicleRunnerConfig) {
    this.config = config;
    const speedKmh = ((config.reportConfig.speed_range_mps[0] + config.reportConfig.speed_range_mps[1]) / 2) * 3.6;
    const stepKm = (speedKmh / 3600) * (config.reportConfig.telemetry_interval_ms / 1000);
    this.interpolated = interpolateRoute(config.waypoints, Math.max(0.01, stepKm));
  }

  start(): void {
    this.stopped = false;
    this.startTelemetry();
    this.scheduleNextIssue();
    this.startModeSwitch();
    this.sendStatus('Active');
  }

  pause(): void {
    this.clearTimers();
  }

  async stop(): Promise<VehicleRunnerStats> {
    this.stopped = true;
    this.clearTimers();
    await this.sendStatus('Idle');
    return { ...this.stats };
  }

  getStats(): VehicleRunnerStats {
    return { ...this.stats };
  }

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
    const delay = randBetween(min, max);
    this.issueTimer = setTimeout(() => {
      if (this.stopped) return;
      this.emitIssue();
      this.scheduleNextIssue();
    }, delay);
  }

  private getCurrentPosition(): IGpsCoordinates {
    if (this.interpolated.length === 0) return { lat: 0, lng: 0 };
    const pos = this.interpolated[this.posIndex % this.interpolated.length]!;
    return pos;
  }

  private advancePosition(): { pos: IGpsCoordinates; prevPos: IGpsCoordinates } {
    const prevPos = this.getCurrentPosition();
    this.posIndex = (this.posIndex + 1) % this.interpolated.length;
    const pos = this.getCurrentPosition();
    return { pos, prevPos };
  }

  private async emitTelemetry(): Promise<void> {
    const { pos, prevPos } = this.advancePosition();
    const distKm = haversineDistance(prevPos, pos);
    this.stats.mileageKm += distKm;

    const [minSpd, maxSpd] = this.config.reportConfig.speed_range_mps;
    const speed = randBetween(minSpd, maxSpd);
    const heading = bearingBetween(prevPos, pos);

    const payload = {
      vehicle_id: this.config.vehicle.vin,
      timestamp: new Date().toISOString(),
      lat: pos.lat,
      lng: pos.lng,
      speed_mps: Number(speed.toFixed(2)),
      mileage_km: Number(distKm.toFixed(4)),
      driving_mode: this.currentMode,
      heading_deg: Number(heading.toFixed(1)),
    };

    try {
      await fetch(`${this.config.ingestBaseUrl}/api/ingest/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      this.stats.telemetrySent++;
    } catch { /* ignore network errors during simulation */ }
  }

  private async emitIssue(): Promise<void> {
    const pos = this.getCurrentPosition();
    const [minSpd, maxSpd] = this.config.reportConfig.speed_range_mps;
    const speed = randBetween(minSpd, maxSpd);

    const payload = {
      run_id: this.config.runId,
      project_id: this.config.projectId,
      task_id: this.config.taskId,
      trigger_timestamp: new Date().toISOString(),
      gps_lat: pos.lat,
      gps_lng: pos.lng,
      category: pick(ISSUE_CATEGORIES),
      severity: pick(ISSUE_SEVERITIES),
      takeover_type: pick(TAKEOVER_TYPES),
      data_snapshot_uri: `sim://snapshot/${this.config.vehicle.vin}/${Date.now()}`,
      environment_tags: ['simulation'],
      description: `[SIM] Auto-generated issue from vehicle ${this.config.vehicle.vin}`,
      vehicle_dynamics: {
        speed_mps: Number(speed.toFixed(2)),
        acceleration_mps2: Number(randBetween(-3, 3).toFixed(2)),
        lateral_acceleration_mps2: Number(randBetween(-1.5, 1.5).toFixed(2)),
        yaw_rate_dps: Number(randBetween(-10, 10).toFixed(2)),
        heading_deg: Number(randBetween(0, 360).toFixed(1)),
        steering_angle_deg: Number(randBetween(-30, 30).toFixed(1)),
        throttle_pct: Number(randBetween(0, 100).toFixed(0)),
        brake_pressure_bar: Number(randBetween(0, 80).toFixed(1)),
      },
    };

    try {
      await fetch(`${this.config.ingestBaseUrl}/api/ingest/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      this.stats.issuesSent++;
    } catch { /* ignore network errors during simulation */ }
  }

  private async sendStatus(status: string): Promise<void> {
    const pos = this.getCurrentPosition();
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
