import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProject, getTasks } from '../api/client';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id!),
    enabled: !!id,
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks', { projectId: id }],
    queryFn: () => getTasks({ projectId: id! }),
    enabled: !!id,
  });

  if (loadingProject) {
    return <div className="loading-center"><div className="spinner" /></div>;
  }

  if (!project) {
    return (
      <div className="empty-state">
        <h3>Project not found</h3>
        <p>The project you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle">{project.description ?? 'No description'}</p>
        </div>
        <span className="badge badge-blue">{project.status}</span>
      </div>

      <div className="detail-grid">
        <div>
          <div className="card">
            <div className="card-header">
              <h3>Tasks</h3>
              <Link to="/tasks" className="btn btn-sm btn-secondary">View All</Link>
            </div>
            {tasks && tasks.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Stage</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id}>
                      <td><Link to={`/tasks/${t.id}`}>{t.title}</Link></td>
                      <td><span className="badge badge-yellow">{t.stage}</span></td>
                      <td><span className="badge badge-gray">{t.priority}</span></td>
                      <td>{t.assignee ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="card-body">
                <p style={{ color: 'var(--text-muted)' }}>No tasks for this project yet.</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header"><h3>Details</h3></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Status</label>
                <p>{project.status}</p>
              </div>
              <div className="form-group">
                <label className="form-label">Created</label>
                <p>{new Date(project.createdAt).toLocaleString()}</p>
              </div>
              <div className="form-group">
                <label className="form-label">Last Updated</label>
                <p>{new Date(project.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
