import { Schema, model, Document, type Model } from 'mongoose';

export const TASK_TYPE = ['Daily', 'Smoke', 'Gray', 'Freeze', 'Retest'] as const;
export type TaskType = (typeof TASK_TYPE)[number];

export const TASK_PRIORITY = ['Low', 'Medium', 'High', 'Critical'] as const;
export type TaskPriority = (typeof TASK_PRIORITY)[number];

export const TASK_STATUS = ['Pending', 'InProgress', 'Completed', 'Cancelled'] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

export interface ITask {
  task_id: string;
  project_id: string;
  name: string;
  task_type: TaskType;
  priority: TaskPriority;
  target_vehicle_count?: number;
  execution_region?: string;
  status: TaskStatus;
  /** RESERVED for future simulation integration */
  simulation_ref: string | null;
  /** RESERVED for future simulation integration */
  simulation_status: string | null;
  extra?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  [key: string]: unknown;
}

export type TaskDocument = ITask & Document;

const TaskSchema = new Schema<TaskDocument>(
  {
    task_id: { type: String, unique: true, required: true },
    project_id: { type: String, required: true, ref: 'Project' },
    name: { type: String, required: true },
    task_type: { type: String, enum: TASK_TYPE, required: true },
    priority: { type: String, enum: TASK_PRIORITY, default: 'Medium' },
    target_vehicle_count: { type: Number },
    execution_region: { type: String },
    status: { type: String, enum: TASK_STATUS, default: 'Pending' },
    simulation_ref: { type: String, default: null },
    simulation_status: { type: String, default: null },
    extra: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    strict: false,
  },
);

TaskSchema.index({ task_id: 1 }, { unique: true });
TaskSchema.index({ project_id: 1 });
TaskSchema.index({ task_type: 1 });
TaskSchema.index({ status: 1 });

export const Task: Model<TaskDocument> = model<TaskDocument>('Task', TaskSchema);
