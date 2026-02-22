import { Schema, model, type Document, type Model } from 'mongoose';

export interface IRun {
  run_id: string;
  task_id: string;
  vehicle_vin: string;
  driver_id?: string;
  start_time?: Date;
  end_time?: Date;
  total_auto_mileage_km: number;
  software_version_hash?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
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
    status: { type: String, default: 'Scheduled' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export const Run: Model<RunDocument> = model<RunDocument>('Run', RunSchema);
