import { Schema, model, Document, type Model } from 'mongoose';

export interface IPtcProject {
  project_id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export type PtcProjectDocument = IPtcProject & Document;

const PtcProjectSchema = new Schema<PtcProjectDocument>(
  {
    project_id: { type: String, unique: true, required: true },
    name: { type: String, unique: true, required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'ptc_projects',
  },
);

PtcProjectSchema.index({ name: 'text' });

export const PtcProject: Model<PtcProjectDocument> = model<PtcProjectDocument>(
  'PtcProject',
  PtcProjectSchema,
);
