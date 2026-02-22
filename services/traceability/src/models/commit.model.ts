import { Schema, model, type Document, type Model } from 'mongoose';

export interface ICommit {
  commit_hash: string;
  message?: string;
  author?: string;
  branch?: string;
  linked_req_ids?: string[];
  linked_issue_ids?: string[];
  created_at?: Date;
}

export type CommitDocument = ICommit & Document;

const CommitSchema = new Schema<CommitDocument>({
  commit_hash: { type: String, unique: true, required: true },
  message: { type: String },
  author: { type: String },
  branch: { type: String },
  linked_req_ids: { type: [String] },
  linked_issue_ids: { type: [String] },
  created_at: { type: Date, default: Date.now },
});

export const Commit: Model<CommitDocument> = model<CommitDocument>('Commit', CommitSchema);
