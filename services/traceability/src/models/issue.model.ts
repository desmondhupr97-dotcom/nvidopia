import { Schema, model, type Document, type Model } from 'mongoose';

export interface IIssue {
  issue_id: string;
  run_id: string;
  category: string;
  severity: string;
  status: string;
  fix_commit_id: string | null;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export type IssueDocument = IIssue & Document;

const IssueSchema = new Schema<IssueDocument>(
  {
    issue_id: { type: String, unique: true, required: true },
    run_id: { type: String, required: true, ref: 'Run' },
    category: { type: String },
    severity: { type: String },
    status: { type: String, default: 'New' },
    fix_commit_id: { type: String, default: null },
    description: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export const Issue: Model<IssueDocument> = model<IssueDocument>('Issue', IssueSchema);
