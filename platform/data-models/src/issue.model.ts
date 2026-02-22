import { Schema, model, Document, type Model } from 'mongoose';
import { type IGpsCoordinates, GpsCoordinatesSchema } from './common.js';

export type { IGpsCoordinates };

export const ISSUE_CATEGORY = ['Perception', 'Prediction', 'Planning', 'Chassis', 'System', 'Other'] as const;
export type IssueCategory = (typeof ISSUE_CATEGORY)[number];

export const ISSUE_SEVERITY = ['Low', 'Medium', 'High', 'Blocker'] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITY)[number];

export const TAKEOVER_TYPE = ['Manual', 'SystemFault', 'Environmental', 'Other'] as const;
export type TakeoverType = (typeof TAKEOVER_TYPE)[number];

export const ISSUE_STATUS = [
  'New', 'Triage', 'Assigned', 'InProgress', 'Fixed',
  'RegressionTracking', 'Closed', 'Reopened', 'Rejected',
] as const;
export type IssueStatus = (typeof ISSUE_STATUS)[number];

export const TRIAGE_MODE = ['manual', 'auto_reserved'] as const;
export type TriageMode = (typeof TRIAGE_MODE)[number];

/* ── Vehicle Dynamics Snapshot (embedded sub-document) ── */

export interface IQuaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

export interface IVehicleDynamicsSnapshot {
  speed_mps?: number;
  acceleration_mps2?: number;
  lateral_acceleration_mps2?: number;
  yaw_rate_dps?: number;
  heading_deg?: number;
  quaternion?: IQuaternion;
  steering_angle_deg?: number;
  throttle_pct?: number;
  brake_pressure_bar?: number;
  gear?: string;
  wheel_speeds_mps?: number[];
  extra?: Record<string, unknown>;
}

const QuaternionSchema = new Schema<IQuaternion>(
  { w: Number, x: Number, y: Number, z: Number },
  { _id: false },
);

const VehicleDynamicsSnapshotSchema = new Schema<IVehicleDynamicsSnapshot>(
  {
    speed_mps: Number,
    acceleration_mps2: Number,
    lateral_acceleration_mps2: Number,
    yaw_rate_dps: Number,
    heading_deg: Number,
    quaternion: { type: QuaternionSchema },
    steering_angle_deg: Number,
    throttle_pct: Number,
    brake_pressure_bar: Number,
    gear: String,
    wheel_speeds_mps: { type: [Number] },
    extra: { type: Schema.Types.Mixed },
  },
  { _id: false, strict: false },
);

export { VehicleDynamicsSnapshotSchema };

/* ── Issue ── */

export interface IIssue {
  issue_id: string;
  run_id: string;
  trigger_timestamp: Date;
  gps_coordinates?: IGpsCoordinates;
  category: IssueCategory;
  severity: IssueSeverity;
  takeover_type?: TakeoverType;
  data_snapshot_url?: string;
  environment_tags?: string[];
  description?: string;
  status: IssueStatus;
  assigned_to: string | null;
  assigned_module: string | null;
  fix_commit_id: string | null;
  fix_version_hash: string | null;
  rejection_reason: string | null;
  /** RESERVED for auto-triage */
  triage_mode: TriageMode;
  /** RESERVED for auto-triage */
  triage_hint: string | null;
  /** RESERVED for auto-triage */
  triage_source: string | null;
  vehicle_dynamics?: IVehicleDynamicsSnapshot;
  extra?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  [key: string]: unknown;
}

export type IssueDocument = IIssue & Document;

const IssueSchema = new Schema<IssueDocument>(
  {
    issue_id: { type: String, unique: true, required: true },
    run_id: { type: String, required: true, ref: 'Run' },
    trigger_timestamp: { type: Date, required: true },
    gps_coordinates: { type: GpsCoordinatesSchema },
    category: { type: String, enum: ISSUE_CATEGORY, required: true },
    severity: { type: String, enum: ISSUE_SEVERITY, required: true },
    takeover_type: { type: String, enum: TAKEOVER_TYPE },
    data_snapshot_url: { type: String },
    environment_tags: { type: [String] },
    description: { type: String },
    status: { type: String, enum: ISSUE_STATUS, default: 'New' },
    assigned_to: { type: String, default: null },
    assigned_module: { type: String, default: null },
    fix_commit_id: { type: String, default: null },
    fix_version_hash: { type: String, default: null },
    rejection_reason: { type: String, default: null },
    triage_mode: { type: String, enum: TRIAGE_MODE, default: 'manual' },
    triage_hint: { type: String, default: null },
    triage_source: { type: String, default: null },
    vehicle_dynamics: { type: VehicleDynamicsSnapshotSchema },
    extra: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    strict: false,
  },
);

IssueSchema.index({ issue_id: 1 }, { unique: true });
IssueSchema.index({ run_id: 1 });
IssueSchema.index({ status: 1 });
IssueSchema.index({ severity: 1 });
IssueSchema.index({ category: 1 });
IssueSchema.index({ run_id: 1, status: 1 });
IssueSchema.index({ category: 1, severity: 1 });

export const Issue: Model<IssueDocument> = model<IssueDocument>('Issue', IssueSchema);
