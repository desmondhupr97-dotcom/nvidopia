import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getRun } from '../api/client';

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: run, isLoading } = useQuery({
    queryKey: ['run', id],
    queryFn: () => getRun(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="loading-center"><div className="spinner" /></div>;
  }

  if (!run) {
    return (
      <div className="empty-state">
        <h3>Run not found</h3>
        <p>The run you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Run {run.id.slice(0, 8)}</h1>
          <p className="page-subtitle">Detailed execution information for this run</p>
        </div>
        <span className="badge badge-blue">{run.status}</span>
      </div>

      <div className="detail-grid">
        <div>
          <div className="card">
            <div className="card-header"><h3>Run Overview</h3></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Run ID</label>
                <p style={{ fontFamily: 'monospace' }}>{run.id}</p>
              </div>
              <div className="form-group">
                <label className="form-label">Task</label>
                <p>
                  {run.taskId
                    ? <Link to={`/tasks/${run.taskId}`} style={{ fontFamily: 'monospace' }}>{run.taskId}</Link>
                    : '—'}
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Vehicles</label>
                <p>{run.vehicleIds?.length ?? 0}</p>
              </div>
              <div className="form-group">
                <label className="form-label">Result</label>
                <p>{run.result ?? '—'}</p>
              </div>
              <div className="form-group">
                <label className="form-label">Started</label>
                <p>{run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'}</p>
              </div>
              <div className="form-group">
                <label className="form-label">Completed</label>
                <p>{run.completedAt ? new Date(run.completedAt).toLocaleString() : '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
