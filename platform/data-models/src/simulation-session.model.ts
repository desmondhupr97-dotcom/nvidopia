import { Schema, model, Document, type Model } from 'mongoose';
import { type IGpsCoordinates, GpsCoordinatesSchema } from './common.js';

export const SIMULATION_STATUS = ['Draft', 'Running', 'Paused', 'Completed', 'Aborted'] as const;
export type SimulationStatus = (typeof SIMULATION_STATUS)[number];

export const FLEET_MODE = ['random', 'custom'] as const;
export type FleetMode = (typeof FLEET_MODE)[number];

export const ROUTE_MODE = ['random', 'custom'] as const;
export type RouteMode = (typeof ROUTE_MODE)[number];

export interface ISimVehicle {
  vin: string;
  plate_type: 'permanent' | 'temporary';
  model_code: string;
  vehicle_platform: string;
  sensor_suite_version: string;
  soc_architecture: string;
}

export interface IFleetConfig {
  mode: FleetMode;
  vehicle_count: number;
  vehicles?: ISimVehicle[];
  vehicle_template?: Partial<ISimVehicle>;
}

export interface ISimRoute {
  route_id: string;
  name?: string;
  waypoints: IGpsCoordinates[];
}

export interface IRandomRouteConfig {
  start_point: IGpsCoordinates;
  radius_km: number;
  min_waypoints: number;
  max_waypoints: number;
}

export interface IRouteConfig {
  mode: RouteMode;
  routes?: ISimRoute[];
  random_config?: IRandomRouteConfig;
}

export interface IReportConfig {
  telemetry_interval_ms: number;
  issue_interval_range_ms: [number, number];
  status_change_interval_ms: number;
  speed_range_mps: [number, number];
}

export interface IVehicleAssignment {
  vin: string;
  project_id: string;
  task_id: string;
  route_id?: string;
}

export interface ISimulationStats {
  telemetry_sent: number;
  issues_sent: number;
  total_mileage_km: number;
}

export interface ISimulationSession {
  session_id: string;
  name: string;
  status: SimulationStatus;
  fleet_config: IFleetConfig;
  route_config: IRouteConfig;
  report_config: IReportConfig;
  assignments: IVehicleAssignment[];
  started_at?: Date;
  stopped_at?: Date;
  stats: ISimulationStats;
  created_at: Date;
  updated_at: Date;
}

export type SimulationSessionDocument = ISimulationSession & Document;

const SimVehicleSchema = new Schema<ISimVehicle>(
  {
    vin: { type: String, required: true },
    plate_type: { type: String, enum: ['permanent', 'temporary'], required: true },
    model_code: { type: String, required: true },
    vehicle_platform: { type: String, required: true },
    sensor_suite_version: { type: String, required: true },
    soc_architecture: { type: String, required: true },
  },
  { _id: false },
);

const SimRouteSchema = new Schema<ISimRoute>(
  {
    route_id: { type: String, required: true },
    name: { type: String },
    waypoints: { type: [GpsCoordinatesSchema], required: true },
  },
  { _id: false },
);

const FleetConfigSchema = new Schema<IFleetConfig>(
  {
    mode: { type: String, enum: FLEET_MODE, required: true },
    vehicle_count: { type: Number, required: true, default: 5 },
    vehicles: { type: [SimVehicleSchema] },
    vehicle_template: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const RouteConfigSchema = new Schema<IRouteConfig>(
  {
    mode: { type: String, enum: ROUTE_MODE, required: true },
    routes: { type: [SimRouteSchema] },
    random_config: {
      type: new Schema(
        {
          start_point: { type: GpsCoordinatesSchema, required: true },
          radius_km: { type: Number, required: true, default: 10 },
          min_waypoints: { type: Number, default: 5 },
          max_waypoints: { type: Number, default: 15 },
        },
        { _id: false },
      ),
    },
  },
  { _id: false },
);

const ReportConfigSchema = new Schema<IReportConfig>(
  {
    telemetry_interval_ms: { type: Number, default: 3000 },
    issue_interval_range_ms: { type: [Number], default: [30000, 120000] },
    status_change_interval_ms: { type: Number, default: 60000 },
    speed_range_mps: { type: [Number], default: [8, 33] },
  },
  { _id: false },
);

const VehicleAssignmentSchema = new Schema<IVehicleAssignment>(
  {
    vin: { type: String, required: true },
    project_id: { type: String, required: true },
    task_id: { type: String, required: true },
    route_id: { type: String },
  },
  { _id: false },
);

const SimulationStatsSchema = new Schema<ISimulationStats>(
  {
    telemetry_sent: { type: Number, default: 0 },
    issues_sent: { type: Number, default: 0 },
    total_mileage_km: { type: Number, default: 0 },
  },
  { _id: false },
);

const SimulationSessionSchema = new Schema<SimulationSessionDocument>(
  {
    session_id: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    status: { type: String, enum: SIMULATION_STATUS, default: 'Draft' },
    fleet_config: { type: FleetConfigSchema, required: true },
    route_config: { type: RouteConfigSchema, required: true },
    report_config: { type: ReportConfigSchema, required: true },
    assignments: { type: [VehicleAssignmentSchema], default: [] },
    started_at: { type: Date },
    stopped_at: { type: Date },
    stats: { type: SimulationStatsSchema, default: () => ({}) },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    strict: false,
  },
);

SimulationSessionSchema.index({ session_id: 1 }, { unique: true });
SimulationSessionSchema.index({ status: 1 });

export const SimulationSession: Model<SimulationSessionDocument> =
  model<SimulationSessionDocument>('SimulationSession', SimulationSessionSchema);
