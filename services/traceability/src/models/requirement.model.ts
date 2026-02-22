import { Schema, model, type Document, type Model } from 'mongoose';

export interface IRequirement {
  req_id: string;
  asil_level?: string;
  description: string;
  source_system?: string;
  external_id?: string;
  created_at: Date;
  updated_at: Date;
}

export type RequirementDocument = IRequirement & Document;

const RequirementSchema = new Schema<RequirementDocument>(
  {
    req_id: { type: String, unique: true, required: true },
    asil_level: { type: String },
    description: { type: String, required: true },
    source_system: { type: String },
    external_id: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export const Requirement: Model<RequirementDocument> =
  model<RequirementDocument>('Requirement', RequirementSchema);
