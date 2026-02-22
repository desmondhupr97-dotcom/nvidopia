import { Schema, model, Document, type Model } from 'mongoose';

export const KPI_METRIC_NAME = [
  'MPI', 'MTTR', 'RegressionPassRate', 'FleetUtilization', 'IssueConvergence',
] as const;
export type KpiMetricName = (typeof KPI_METRIC_NAME)[number];

export interface IKpiSnapshot {
  snapshot_id: string;
  metric_name: KpiMetricName;
  project_id?: string;
  task_id?: string;
  value: number;
  unit?: string;
  window_start?: Date;
  window_end?: Date;
  dimensions?: Record<string, unknown>;
  created_at: Date;
}

export type KpiSnapshotDocument = IKpiSnapshot & Document;

const KpiSnapshotSchema = new Schema<KpiSnapshotDocument>(
  {
    snapshot_id: { type: String, unique: true, required: true },
    metric_name: { type: String, enum: KPI_METRIC_NAME, required: true },
    project_id: { type: String },
    task_id: { type: String },
    value: { type: Number, required: true },
    unit: { type: String },
    window_start: { type: Date },
    window_end: { type: Date },
    dimensions: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } },
);

KpiSnapshotSchema.index({ metric_name: 1 });
KpiSnapshotSchema.index({ project_id: 1 });
KpiSnapshotSchema.index({ window_start: 1 });

export const KpiSnapshot: Model<KpiSnapshotDocument> =
  model<KpiSnapshotDocument>('KpiSnapshot', KpiSnapshotSchema);
