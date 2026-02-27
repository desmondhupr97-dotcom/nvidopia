import { Schema, model, Document, type Model } from 'mongoose';

export interface IPtcBuild {
  build_id: string;
  version_tag: string;
  build_time?: Date;
  created_at?: Date;
}

export type PtcBuildDocument = IPtcBuild & Document;

const PtcBuildSchema = new Schema<PtcBuildDocument>(
  {
    build_id: { type: String, unique: true, required: true },
    version_tag: { type: String, required: true },
    build_time: { type: Date },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'ptc_builds' },
);

PtcBuildSchema.index({ version_tag: 'text' });

export const PtcBuild: Model<PtcBuildDocument> = model<PtcBuildDocument>(
  'PtcBuild',
  PtcBuildSchema,
);
