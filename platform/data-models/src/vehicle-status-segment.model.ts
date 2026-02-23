import { Schema, model, Document, type Model } from 'mongoose';
import { type DrivingMode, DRIVING_MODE } from './vehicle.model.js';

export interface IVehicleStatusSegment {
  vin: string;
  run_id?: string;
  driving_mode: DrivingMode;
  start_time: Date;
  end_time?: Date;
  duration_ms?: number;
  mileage_km: number;
}

export type VehicleStatusSegmentDocument = IVehicleStatusSegment & Document;

const VehicleStatusSegmentSchema = new Schema<VehicleStatusSegmentDocument>(
  {
    vin: { type: String, required: true },
    run_id: { type: String },
    driving_mode: { type: String, enum: DRIVING_MODE, required: true },
    start_time: { type: Date, required: true },
    end_time: { type: Date },
    duration_ms: { type: Number },
    mileage_km: { type: Number, default: 0 },
  },
  { timestamps: false },
);

VehicleStatusSegmentSchema.index({ vin: 1, start_time: -1 });
VehicleStatusSegmentSchema.index({ run_id: 1 });
VehicleStatusSegmentSchema.index({ driving_mode: 1 });

export const VehicleStatusSegment: Model<VehicleStatusSegmentDocument> =
  model<VehicleStatusSegmentDocument>('VehicleStatusSegment', VehicleStatusSegmentSchema);
