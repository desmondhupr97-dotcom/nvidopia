import { Schema, model, Document, type Model } from 'mongoose';

export const RUN_STATUS = ['Scheduled', 'Active', 'Completed', 'Aborted'] as const;
export type RunStatus = (typeof RUN_STATUS)[number];

export interface IRun {
  run_id: string;
  task_id: string;
  vehicle_vin: string;
  driver_id?: string;
  start_time?: Date;
  end_time?: Date;
  total_auto_mileage_km: number;
  software_version_hash?: string;
  hardware_heartbeat_version?: string;
  status: RunStatus;
  /** RESERVED for future simulation integration */
  simulation_ref: string | null;
  /** RESERVED for future simulation integration */
  simulation_status: string | null;
  extra?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  [key: string]: unknown;
}

export type RunDocument = IRun & Document;

const RunSchema = new Schema<RunDocument>(
  {
    run_id: { type: String, unique: true, required: true },
    task_id: { type: String, required: true, ref: 'Task' },
    vehicle_vin: { type: String, required: true },
    driver_id: { type: String },
    start_time: { type: Date },
    end_time: { type: Date },
    total_auto_mileage_km: { type: Number, default: 0 },
    software_version_hash: { type: String },
    hardware_heartbeat_version: { type: String },
    status: { type: String, enum: RUN_STATUS, default: 'Scheduled' },
    simulation_ref: { type: String, default: null },
    simulation_status: { type: String, default: null },
    extra: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    strict: false,
  },
);

RunSchema.index({ run_id: 1 }, { unique: true });
RunSchema.index({ task_id: 1 });
RunSchema.index({ vehicle_vin: 1 });
RunSchema.index({ status: 1 });
RunSchema.index({ task_id: 1, status: 1 });
RunSchema.index({ vehicle_vin: 1, status: 1 });

export const Run: Model<RunDocument> = model<RunDocument>('Run', RunSchema);
