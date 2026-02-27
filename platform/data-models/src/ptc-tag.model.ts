import { Schema, model, Document, type Model } from 'mongoose';

export interface IPtcTag {
  tag_id: string;
  name: string;
  created_at?: Date;
}

export type PtcTagDocument = IPtcTag & Document;

const PtcTagSchema = new Schema<PtcTagDocument>(
  {
    tag_id: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'ptc_tags' },
);

PtcTagSchema.index({ name: 'text' });

export const PtcTag: Model<PtcTagDocument> = model<PtcTagDocument>(
  'PtcTag',
  PtcTagSchema,
);
