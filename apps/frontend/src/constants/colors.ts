export const statusColor: Record<string, string> = {
  Planning: 'blue', Active: 'purple', Completed: 'green', Archived: 'default', Frozen: 'cyan',
  Pending: 'default', InProgress: 'gold', Cancelled: 'default',
  Scheduled: 'blue', Aborted: 'red',
  New: 'blue', Triage: 'purple', Assigned: 'geekblue', Fixed: 'green',
  RegressionTracking: 'cyan', Closed: 'default', Reopened: 'orange', Rejected: 'red',
  backlog: 'default', ready: 'blue', 'in-progress': 'gold', review: 'purple', done: 'green',
  pending: 'default', queued: 'blue', running: 'gold', passed: 'green', failed: 'red', cancelled: 'default',
  open: 'blue', triaged: 'purple', fixed: 'green', verified: 'cyan', closed: 'default', 'wont-fix': 'red', duplicate: 'default',
};

export const stageColor: Record<string, string> = {
  Pending: 'default', Smoke: 'cyan', Gray: 'gold', Freeze: 'orange', GoLive: 'green',
  backlog: 'default', ready: 'blue', 'in-progress': 'gold', review: 'purple', done: 'green',
};

export const priorityColor: Record<string, string> = {
  Critical: 'red', High: 'orange', Medium: 'gold', Low: 'blue',
  critical: 'red', high: 'orange', medium: 'gold', low: 'blue',
};

export const severityColor: Record<string, string> = {
  Blocker: 'red', Critical: 'red', High: 'orange', Medium: 'gold', Low: 'blue', Trivial: 'green',
  blocker: 'red', critical: 'red', high: 'orange', medium: 'gold', low: 'blue', trivial: 'green',
  Minor: 'gold', Major: 'orange',
};

export const transitionColor: Record<string, string> = {
  Triage: 'gold', Assigned: 'geekblue', InProgress: 'purple', Fixed: 'green',
  RegressionTracking: 'cyan', Closed: 'default', Reopened: 'orange', Rejected: 'red',
};
