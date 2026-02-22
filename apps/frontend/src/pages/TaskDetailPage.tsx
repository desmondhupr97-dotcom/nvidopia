import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTask, getRuns } from '../api/client';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => getTask(id!),
    enabled: !!id,
  });

  const { data: runs } = useQuery({
    queryKey: ['runs', { taskId: id }],
    queryFn: () => getRuns({ taskId: id! }),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="loading-center"><div className="spinner" /></div>;
  }

  if (!task) {
    return (
      <div className="empty-state">
        <h3>Task not found</h3>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{task.title}</h1>
          <p className="page-subtitle">{task.description ?? 'No description'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-yellow">{task.stage}</span>
          <span className="badge badge-gray">{task.priority}</span>
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><h3>Test Runs</h3></div>
            {runs && runs.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Run ID</th>
                    <th>Status</th>
                    <th>Result</th>
                    <th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id}>
                      <td><Link to={`/runs/${r.id}`}>{r.id.slice(0, 8)}</Link></td>
                      <td><span className="badge badge-blue">{r.status}</span></td>
                      <td>{r.result ?? '—'}</td>
                      <td>{r.startedAt ? new Date(r.startedAt).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="card-body">
                <p style={{ color: 'var(--text-muted)' }}>No runs executed yet.</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header"><h3>Details</h3></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Stage</label>
                <p>{task.stage}</p>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <p>{task.priority}</p>
              </div>
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <p>{task.assignee ?? 'Unassigned'}</p>
              </div>
              <div className="form-group">
                <label className="form-label">Created</label>
                <p>{new Date(task.createdAt).toLocaleString()}</p>
              </div>
              <div className="form-group">
                <label className="form-label">Last Updated</label>
                <p>{new Date(task.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
