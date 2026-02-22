import { Schema, model, type Document, type Model } from 'mongoose';

export interface IBuild {
  build_hash: string;
  version_tag: string;
  commit_hashes?: string[];
  build_time?: Date;
  created_at?: Date;
}

export type BuildDocument = IBuild & Document;

const BuildSchema = new Schema<BuildDocument>({
  build_hash: { type: String, unique: true, required: true },
  version_tag: { type: String, required: true },
  commit_hashes: { type: [String] },
  build_time: { type: Date },
  created_at: { type: Date, default: Date.now },
});

export const Build: Model<BuildDocument> = model<BuildDocument>('Build', BuildSchema);
