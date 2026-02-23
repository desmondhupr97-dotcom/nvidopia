import { Schema, model, Document, type Model } from 'mongoose';
import { type IGpsCoordinates, GpsCoordinatesSchema } from './common.js';

export const VEHICLE_STATUS = ['Offline', 'Idle', 'Active', 'Maintenance'] as const;
export type VehicleStatus = (typeof VEHICLE_STATUS)[number];

export const DRIVING_MODE = ['Manual', 'ACC', 'LCC', 'HighwayPilot', 'UrbanPilot', 'Standby', 'Autonomous'] as const;
export type DrivingMode = (typeof DRIVING_MODE)[number];

export const PLATE_TYPE = ['permanent', 'temporary'] as const;
export type PlateType = (typeof PLATE_TYPE)[number];

export interface IVehicle {
  vin: string;
  plate_type?: PlateType;
  model_code?: string;
  vehicle_platform?: string;
  sensor_suite_version?: string;
  soc_architecture?: string;
  component_versions?: Record<string, string>;
  current_status: VehicleStatus;
  last_heartbeat?: Date;
  current_location?: IGpsCoordinates;
  current_speed_mps?: number;
  fuel_or_battery_level?: number;
  driving_mode?: DrivingMode;
  updated_at: Date;
}

export type VehicleDocument = IVehicle & Document;

const VehicleSchema = new Schema<VehicleDocument>(
  {
    vin: { type: String, unique: true, required: true },
    plate_type: { type: String, enum: PLATE_TYPE },
    model_code: { type: String },
    vehicle_platform: { type: String },
    sensor_suite_version: { type: String },
    soc_architecture: { type: String },
    component_versions: { type: Schema.Types.Mixed },
    current_status: { type: String, enum: VEHICLE_STATUS, default: 'Offline' },
    last_heartbeat: { type: Date },
    current_location: { type: GpsCoordinatesSchema },
    current_speed_mps: { type: Number },
    fuel_or_battery_level: { type: Number },
    driving_mode: { type: String, enum: DRIVING_MODE },
  },
  { timestamps: { createdAt: false, updatedAt: 'updated_at' }, strict: false },
);

VehicleSchema.index({ model_code: 1 });
VehicleSchema.index({ plate_type: 1 });
VehicleSchema.index({ current_status: 1 });
VehicleSchema.index({ driving_mode: 1 });

export const Vehicle: Model<VehicleDocument> = model<VehicleDocument>('Vehicle', VehicleSchema);
