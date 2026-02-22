import mongoose, { Schema, Document } from 'mongoose';

export interface IRun extends Document {
  run_id: string;
  task_id: string;
  vehicle_vin: string;
  start_time: Date;
  end_time?: Date;
  total_auto_mileage_km: number;
  status: string;
}

const RunSchema = new Schema<IRun>(
  {
    run_id: { type: String, required: true, unique: true },
    task_id: { type: String, required: true, index: true },
    vehicle_vin: { type: String, required: true },
    start_time: { type: Date, required: true },
    end_time: { type: Date },
    total_auto_mileage_km: { type: Number, default: 0 },
    status: { type: String, required: true },
  },
  { timestamps: false },
);

export const Run = mongoose.model<IRun>('Run', RunSchema);
