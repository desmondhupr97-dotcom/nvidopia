import { Schema, model, Document, type Model } from 'mongoose';

export interface IPtcDrive {
  drive_id: string;
  car_id: string;
  build_id: string;
  tag_id: string;
  date: Date;
  start_time: Date;
  end_time: Date;
  mileage_km: number;
  xl_events: number;
  l_events: number;
  hotline_count: number;
  route?: string;
  created_at?: Date;
}

export type PtcDriveDocument = IPtcDrive & Document;

const PtcDriveSchema = new Schema<PtcDriveDocument>(
  {
    drive_id: { type: String, unique: true, required: true },
    car_id: { type: String, required: true, ref: 'PtcCar' },
    build_id: { type: String, required: true, ref: 'PtcBuild' },
    tag_id: { type: String, required: true, ref: 'PtcTag' },
    date: { type: Date, required: true },
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },
    mileage_km: { type: Number, default: 0 },
    xl_events: { type: Number, default: 0 },
    l_events: { type: Number, default: 0 },
    hotline_count: { type: Number, default: 0 },
    route: { type: String },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'ptc_drives' },
);

PtcDriveSchema.index({ car_id: 1, build_id: 1, tag_id: 1 });
PtcDriveSchema.index({ date: 1 });
PtcDriveSchema.index({ build_id: 1 });
PtcDriveSchema.index({ tag_id: 1 });
PtcDriveSchema.index({ car_id: 1 });

export const PtcDrive: Model<PtcDriveDocument> = model<PtcDriveDocument>(
  'PtcDrive',
  PtcDriveSchema,
);
