import { Schema, model, type Document, type Model } from 'mongoose';

export interface ITask {
  task_id: string;
  project_id: string;
  name: string;
  task_type: string;
  priority: string;
  target_vehicle_count?: number;
  execution_region?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export type TaskDocument = ITask & Document;

const TaskSchema = new Schema<TaskDocument>(
  {
    task_id: { type: String, unique: true, required: true },
    project_id: { type: String, required: true, ref: 'Project' },
    name: { type: String, required: true },
    task_type: { type: String },
    priority: { type: String },
    target_vehicle_count: { type: Number },
    execution_region: { type: String },
    status: { type: String, default: 'Pending' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export const Task: Model<TaskDocument> = model<TaskDocument>('Task', TaskSchema);
