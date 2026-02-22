import { Schema, model, Document, type Model } from 'mongoose';
import { type IGpsCoordinates, GpsCoordinatesSchema } from './common.js';

export const VEHICLE_STATUS = ['Offline', 'Idle', 'Active', 'Maintenance'] as const;
export type VehicleStatus = (typeof VEHICLE_STATUS)[number];

export const DRIVING_MODE = ['Manual', 'Autonomous', 'Standby'] as const;
export type DrivingMode = (typeof DRIVING_MODE)[number];

export interface IVehicle {
  vin: string;
  vehicle_platform?: string;
  sensor_suite_version?: string;
  soc_architecture?: string;
  current_status: VehicleStatus;
  last_heartbeat?: Date;
  current_location?: IGpsCoordinates;
  fuel_or_battery_level?: number;
  driving_mode?: DrivingMode;
  updated_at: Date;
}

export type VehicleDocument = IVehicle & Document;

const VehicleSchema = new Schema<VehicleDocument>(
  {
    vin: { type: String, unique: true, required: true },
    vehicle_platform: { type: String },
    sensor_suite_version: { type: String },
    soc_architecture: { type: String },
    current_status: { type: String, enum: VEHICLE_STATUS, default: 'Offline' },
    last_heartbeat: { type: Date },
    current_location: { type: GpsCoordinatesSchema },
    fuel_or_battery_level: { type: Number },
    driving_mode: { type: String, enum: DRIVING_MODE },
  },
  { timestamps: { createdAt: false, updatedAt: 'updated_at' } },
);

export const Vehicle: Model<VehicleDocument> = model<VehicleDocument>('Vehicle', VehicleSchema);
