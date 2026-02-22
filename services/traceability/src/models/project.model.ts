import { Schema, model, type Document, type Model } from 'mongoose';

export interface IProject {
  project_id: string;
  name: string;
  vehicle_platform: string;
  soc_architecture: string;
  sensor_suite_version: string;
  software_baseline_version: string;
  target_mileage_km?: number;
  start_date: Date;
  end_date?: Date;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export type ProjectDocument = IProject & Document;

const ProjectSchema = new Schema<ProjectDocument>(
  {
    project_id: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    vehicle_platform: { type: String },
    soc_architecture: { type: String },
    sensor_suite_version: { type: String },
    software_baseline_version: { type: String, required: true },
    target_mileage_km: { type: Number },
    start_date: { type: Date },
    end_date: { type: Date },
    status: { type: String, default: 'Planning' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export const Project: Model<ProjectDocument> = model<ProjectDocument>('Project', ProjectSchema);
