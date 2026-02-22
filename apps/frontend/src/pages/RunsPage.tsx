import { useQuery } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { getRuns } from '../api/client';

const statusBadge: Record<string, string> = {
  pending: 'badge-gray',
  queued: 'badge-blue',
  running: 'badge-yellow',
  passed: 'badge-green',
  failed: 'badge-red',
  cancelled: 'badge-gray',
};

export default function RunsPage() {
  const { data: runs, isLoading, error } = useQuery({
    queryKey: ['runs'],
    queryFn: () => getRuns(),
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Test Runs</h1>
          <p className="page-subtitle">Monitor and manage test execution runs</p>
        </div>
      </div>

      {isLoading && (
        <div className="loading-center"><div className="spinner" /></div>
      )}

      {error && (
        <div className="card">
          <div className="card-body">
            <p style={{ color: 'var(--danger)' }}>Failed to load runs.</p>
          </div>
        </div>
      )}

      {runs && runs.length === 0 && (
        <div className="empty-state">
          <Play size={48} />
          <h3>No test runs</h3>
          <p>Test runs will appear here once tasks are executed.</p>
        </div>
      )}

      {runs && runs.length > 0 && (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Task</th>
                <th>Status</th>
                <th>Result</th>
                <th>Vehicles</th>
                <th>Started</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td><span style={{ fontFamily: 'monospace' }}>{r.id.slice(0, 8)}</span></td>
                  <td><span style={{ fontFamily: 'monospace' }}>{r.taskId.slice(0, 8)}</span></td>
                  <td><span className={`badge ${statusBadge[r.status] ?? 'badge-gray'}`}>{r.status}</span></td>
                  <td>{r.result ?? '—'}</td>
                  <td>{r.vehicleIds?.length ?? 0}</td>
                  <td>{r.startedAt ? new Date(r.startedAt).toLocaleString() : '—'}</td>
                  <td>{r.completedAt ? new Date(r.completedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
