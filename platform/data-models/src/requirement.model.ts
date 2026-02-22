import { Schema, model, Document, type Model } from 'mongoose';

export const ASIL_LEVEL = ['QM', 'A', 'B', 'C', 'D'] as const;
export type AsilLevel = (typeof ASIL_LEVEL)[number];

export interface IRequirement {
  req_id: string;
  asil_level?: AsilLevel;
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
    asil_level: { type: String, enum: ASIL_LEVEL },
    description: { type: String, required: true },
    source_system: { type: String },
    external_id: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export const Requirement: Model<RequirementDocument> =
  model<RequirementDocument>('Requirement', RequirementSchema);
