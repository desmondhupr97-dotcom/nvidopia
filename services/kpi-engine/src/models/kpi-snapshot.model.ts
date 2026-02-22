import mongoose, { Schema, Document } from 'mongoose';

export enum MetricName {
  MPI = 'MPI',
  MTTR = 'MTTR',
  RegressionPassRate = 'RegressionPassRate',
  FleetUtilization = 'FleetUtilization',
  IssueConvergence = 'IssueConvergence',
}

export interface IKpiSnapshot extends Document {
  snapshot_id: string;
  metric_name: MetricName;
  project_id: string;
  task_id?: string;
  value: number;
  unit: string;
  window_start: Date;
  window_end: Date;
  dimensions?: Record<string, unknown>;
  created_at: Date;
}

const KpiSnapshotSchema = new Schema<IKpiSnapshot>(
  {
    snapshot_id: { type: String, required: true, unique: true },
    metric_name: {
      type: String,
      required: true,
      enum: Object.values(MetricName),
    },
    project_id: { type: String, required: true },
    task_id: { type: String },
    value: { type: Number, required: true },
    unit: { type: String, required: true },
    window_start: { type: Date, required: true },
    window_end: { type: Date, required: true },
    dimensions: { type: Schema.Types.Mixed },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

KpiSnapshotSchema.index({ metric_name: 1, project_id: 1, window_start: 1 });

export const KpiSnapshot = mongoose.model<IKpiSnapshot>('KpiSnapshot', KpiSnapshotSchema);
