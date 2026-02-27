import { Schema, model, Document, type Model } from 'mongoose';

export interface IPtcTask {
  task_id: string;
  project_id: string;
  name: string;
  start_date?: Date;
  end_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export type PtcTaskDocument = IPtcTask & Document;

const PtcTaskSchema = new Schema<PtcTaskDocument>(
  {
    task_id: { type: String, unique: true, required: true },
    project_id: { type: String, required: true, ref: 'PtcProject' },
    name: { type: String, required: true },
    start_date: { type: Date },
    end_date: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'ptc_tasks',
  },
);

PtcTaskSchema.index({ project_id: 1 });
PtcTaskSchema.index({ project_id: 1, name: 1 }, { unique: true });
PtcTaskSchema.index({ name: 'text' });

export const PtcTask: Model<PtcTaskDocument> = model<PtcTaskDocument>(
  'PtcTask',
  PtcTaskSchema,
);
