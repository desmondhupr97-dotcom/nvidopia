import { Schema, model, Document, type Model } from 'mongoose';

export const CHANNEL_TYPE = ['sensor', 'target', 'state_machine', 'vehicle_dynamics', 'other'] as const;
export type ChannelType = (typeof CHANNEL_TYPE)[number];

export interface ITimeSeriesDataPoint {
  t: number;
  values: Record<string, number | string | boolean>;
}

export interface ITimeRange {
  start: number;
  end: number;
}

export interface IIssueTimeSeries {
  issue_id: string;
  channel: string;
  channel_type: ChannelType;
  data_points: ITimeSeriesDataPoint[];
  time_range_ms: ITimeRange;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

export type IssueTimeSeriesDocument = IIssueTimeSeries & Document;

const DataPointSchema = new Schema<ITimeSeriesDataPoint>(
  {
    t: { type: Number, required: true },
    values: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const TimeRangeSchema = new Schema<ITimeRange>(
  {
    start: { type: Number, required: true },
    end: { type: Number, required: true },
  },
  { _id: false },
);

const IssueTimeSeriesSchema = new Schema<IssueTimeSeriesDocument>(
  {
    issue_id: { type: String, required: true, ref: 'Issue' },
    channel: { type: String, required: true },
    channel_type: { type: String, enum: CHANNEL_TYPE, required: true },
    data_points: { type: [DataPointSchema], default: [] },
    time_range_ms: { type: TimeRangeSchema, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    strict: false,
  },
);

IssueTimeSeriesSchema.index({ issue_id: 1, channel: 1 }, { unique: true });
IssueTimeSeriesSchema.index({ issue_id: 1, channel_type: 1 });

export const IssueTimeSeries: Model<IssueTimeSeriesDocument> =
  model<IssueTimeSeriesDocument>('IssueTimeSeries', IssueTimeSeriesSchema);
