import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, ListChecks } from 'lucide-react';
import { getTasks } from '../api/client';

const stageBadge: Record<string, string> = {
  backlog: 'badge-gray',
  ready: 'badge-blue',
  'in-progress': 'badge-yellow',
  review: 'badge-purple',
  done: 'badge-green',
};

const priorityBadge: Record<string, string> = {
  critical: 'badge-red',
  high: 'badge-orange',
  medium: 'badge-yellow',
  low: 'badge-blue',
};

export default function TasksPage() {
  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks(),
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">Track test campaign tasks through their lifecycle</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={16} /> New Task
        </button>
      </div>

      {isLoading && (
        <div className="loading-center"><div className="spinner" /></div>
      )}

      {error && (
        <div className="card">
          <div className="card-body">
            <p style={{ color: 'var(--danger)' }}>Failed to load tasks.</p>
          </div>
        </div>
      )}

      {tasks && tasks.length === 0 && (
        <div className="empty-state">
          <ListChecks size={48} />
          <h3>No tasks yet</h3>
          <p>Create tasks to plan and track your test activities.</p>
        </div>
      )}

      {tasks && tasks.length > 0 && (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Stage</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td><Link to={`/tasks/${t.id}`}>{t.title}</Link></td>
                  <td><span className={`badge ${stageBadge[t.stage] ?? 'badge-gray'}`}>{t.stage}</span></td>
                  <td><span className={`badge ${priorityBadge[t.priority] ?? 'badge-gray'}`}>{t.priority}</span></td>
                  <td>{t.assignee ?? '—'}</td>
                  <td>{new Date(t.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
