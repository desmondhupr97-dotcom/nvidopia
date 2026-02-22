import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Bug } from 'lucide-react';
import { getIssues } from '../api/client';

const statusBadge: Record<string, string> = {
  New: 'badge-status-open',
  Triage: 'badge-status-triaged',
  Assigned: 'badge-status-in-progress',
  InProgress: 'badge-status-in-progress',
  Fixed: 'badge-status-fixed',
  RegressionTracking: 'badge-status-verified',
  Closed: 'badge-status-closed',
  Reopened: 'badge-status-open',
  Rejected: 'badge-status-wont-fix',
  open: 'badge-status-open',
  triaged: 'badge-status-triaged',
  'in-progress': 'badge-status-in-progress',
  fixed: 'badge-status-fixed',
  verified: 'badge-status-verified',
  closed: 'badge-status-closed',
  'wont-fix': 'badge-status-wont-fix',
  duplicate: 'badge-status-duplicate',
};

const severityBadge: Record<string, string> = {
  Blocker: 'badge-red',
  High: 'badge-orange',
  Medium: 'badge-yellow',
  Low: 'badge-blue',
  critical: 'badge-red',
  high: 'badge-orange',
  medium: 'badge-yellow',
  low: 'badge-blue',
};

export default function IssuesPage() {
  const { data: issues, isLoading, error } = useQuery({
    queryKey: ['issues'],
    queryFn: () => getIssues(),
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Issues</h1>
          <p className="page-subtitle">Track defects and issues found during testing</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={16} /> Report Issue
        </button>
      </div>

      {isLoading && (
        <div className="loading-center"><div className="spinner" /></div>
      )}

      {error && (
        <div className="card">
          <div className="card-body">
            <p style={{ color: 'var(--danger)' }}>Failed to load issues.</p>
          </div>
        </div>
      )}

      {issues && issues.length === 0 && (
        <div className="empty-state">
          <Bug size={48} />
          <h3>No issues reported</h3>
          <p>Issues found during test runs will appear here.</p>
        </div>
      )}

      {issues && issues.length > 0 && (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Severity</th>
                <th>Assignee</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue.id}>
                  <td><Link to={`/issues/${issue.id}`}>{issue.title}</Link></td>
                  <td><span className={`badge ${statusBadge[issue.status] ?? 'badge-gray'}`}>{issue.status}</span></td>
                  <td><span className={`badge ${severityBadge[issue.severity] ?? 'badge-gray'}`}>{issue.severity}</span></td>
                  <td>{issue.assignee ?? '—'}</td>
                  <td>{new Date(issue.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
