import crypto from 'node:crypto';
import { Issue, IssueStateTransition, type IssueStatus, type IssueDocument } from '@nvidopia/data-models';

const VALID_TRANSITIONS = new Map<IssueStatus, IssueStatus[]>([
  ['New',                ['Triage', 'Rejected']],
  ['Triage',             ['Assigned', 'Rejected']],
  ['Assigned',           ['InProgress']],
  ['InProgress',         ['Fixed']],
  ['Fixed',              ['RegressionTracking']],
  ['RegressionTracking', ['Closed', 'Reopened']],
  ['Reopened',           ['InProgress']],
  ['Closed',             []],
  ['Rejected',           []],
]);

export function getValidTransitions(fromStatus: IssueStatus): IssueStatus[] {
  return VALID_TRANSITIONS.get(fromStatus) ?? [];
}

export function validateTransition(
  fromStatus: IssueStatus,
  toStatus: IssueStatus,
): { valid: boolean; error?: string } {
  const allowed = VALID_TRANSITIONS.get(fromStatus);
  if (!allowed) return { valid: false, error: `Unknown status: "${fromStatus}"` };
  if (allowed.length === 0) return { valid: false, error: `"${fromStatus}" is a terminal state — no transitions allowed` };
  if (!allowed.includes(toStatus)) {
    return { valid: false, error: `Transition from "${fromStatus}" to "${toStatus}" is not allowed. Valid targets: [${allowed.join(', ')}]` };
  }
  return { valid: true };
}

export async function executeTransition(
  issueId: string,
  toStatus: IssueStatus,
  triggeredBy: string,
  reason?: string,
  metadata?: Record<string, unknown>,
): Promise<IssueDocument> {
  const issue = await Issue.findOne({ issue_id: issueId });
  if (!issue) throw new Error(`Issue "${issueId}" not found`);

  const fromStatus = issue.status as IssueStatus;
  const result = validateTransition(fromStatus, toStatus);
  if (!result.valid) {
    const err = new Error(result.error) as Error & { code: string; allowed: IssueStatus[] };
    err.code = 'INVALID_TRANSITION';
    err.allowed = getValidTransitions(fromStatus);
    throw err;
  }

  issue.status = toStatus;
  issue.updated_at = new Date();
  await issue.save();

  await IssueStateTransition.create({
    transition_id: `tr-${crypto.randomUUID()}`,
    issue_id: issueId,
    from_status: fromStatus,
    to_status: toStatus,
    triggered_by: triggeredBy,
    reason,
    metadata,
  });

  return issue;
}
