import { Schema, model, Document, type Model } from 'mongoose';
import { type IGpsCoordinates, GpsCoordinatesSchema } from './common.js';
import { type DrivingMode, DRIVING_MODE } from './vehicle.model.js';

export interface IVehicleTrajectoryPoint {
  vin: string;
  run_id?: string;
  timestamp: Date;
  location: IGpsCoordinates;
  speed_mps: number;
  driving_mode: DrivingMode;
  heading_deg?: number;
}

export type VehicleTrajectoryPointDocument = IVehicleTrajectoryPoint & Document;

const VehicleTrajectoryPointSchema = new Schema<VehicleTrajectoryPointDocument>(
  {
    vin: { type: String, required: true },
    run_id: { type: String },
    timestamp: { type: Date, required: true },
    location: { type: GpsCoordinatesSchema, required: true },
    speed_mps: { type: Number, required: true, default: 0 },
    driving_mode: { type: String, enum: DRIVING_MODE, required: true },
    heading_deg: { type: Number },
  },
  { timestamps: false },
);

VehicleTrajectoryPointSchema.index({ vin: 1, timestamp: 1 });
VehicleTrajectoryPointSchema.index({ run_id: 1, timestamp: 1 });
VehicleTrajectoryPointSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

export const VehicleTrajectory: Model<VehicleTrajectoryPointDocument> =
  model<VehicleTrajectoryPointDocument>('VehicleTrajectory', VehicleTrajectoryPointSchema);
