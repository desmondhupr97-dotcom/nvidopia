import { Schema, model, type Document, type Model } from 'mongoose';

export interface IIssueStateTransition {
  transition_id: string;
  issue_id: string;
  from_status: string;
  to_status: string;
  triggered_by: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

export type IssueStateTransitionDocument = IIssueStateTransition & Document;

const IssueStateTransitionSchema = new Schema<IssueStateTransitionDocument>(
  {
    transition_id: { type: String, unique: true, required: true },
    issue_id: { type: String, required: true, ref: 'Issue' },
    from_status: { type: String, required: true },
    to_status: { type: String, required: true },
    triggered_by: { type: String, required: true },
    reason: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } },
);

IssueStateTransitionSchema.index({ issue_id: 1 });
IssueStateTransitionSchema.index({ created_at: 1 });

export const IssueStateTransition: Model<IssueStateTransitionDocument> =
  model<IssueStateTransitionDocument>('IssueStateTransition', IssueStateTransitionSchema);
