import mongoose, { Schema, Document } from 'mongoose';

export interface IIssue extends Document {
  issue_id: string;
  run_id: string;
  status: string;
  severity: string;
  category: string;
  takeover_type?: string;
  created_at: Date;
  updated_at: Date;
}

const IssueSchema = new Schema<IIssue>(
  {
    issue_id: { type: String, required: true, unique: true },
    run_id: { type: String, required: true, index: true },
    status: { type: String, required: true },
    severity: { type: String, required: true },
    category: { type: String, required: true },
    takeover_type: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

export const Issue = mongoose.model<IIssue>('Issue', IssueSchema);
