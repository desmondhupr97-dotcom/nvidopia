import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  task_id: string;
  project_id: string;
  task_type: string;
  status: string;
}

const TaskSchema = new Schema<ITask>(
  {
    task_id: { type: String, required: true, unique: true },
    project_id: { type: String, required: true, index: true },
    task_type: { type: String, required: true },
    status: { type: String, required: true },
  },
  { timestamps: false },
);

export const Task = mongoose.model<ITask>('Task', TaskSchema);
