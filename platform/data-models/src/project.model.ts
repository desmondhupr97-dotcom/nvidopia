import { Schema, model, Document, type Model } from 'mongoose';

export const PROJECT_STATUS = ['Planning', 'Active', 'Frozen', 'Completed', 'Archived'] as const;
export type ProjectStatus = (typeof PROJECT_STATUS)[number];

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
  status: ProjectStatus;
  extra?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  [key: string]: unknown;
}

export type ProjectDocument = IProject & Document;

const ProjectSchema = new Schema<ProjectDocument>(
  {
    project_id: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    vehicle_platform: { type: String, required: true },
    soc_architecture: { type: String, required: true },
    sensor_suite_version: { type: String, required: true },
    software_baseline_version: { type: String, required: true },
    target_mileage_km: { type: Number },
    start_date: { type: Date, required: true },
    end_date: { type: Date },
    status: {
      type: String,
      enum: PROJECT_STATUS,
      default: 'Planning',
    },
    extra: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    strict: false,
  },
);

ProjectSchema.index({ project_id: 1 }, { unique: true });
ProjectSchema.index({ status: 1 });

export const Project: Model<ProjectDocument> = model<ProjectDocument>('Project', ProjectSchema);
