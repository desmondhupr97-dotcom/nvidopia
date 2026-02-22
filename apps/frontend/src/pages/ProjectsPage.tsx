import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban } from 'lucide-react';
import { getProjects } from '../api/client';
import type { Project } from '../api/client';

export default function ProjectsPage() {
  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Manage autonomous driving test projects</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={16} /> New Project
        </button>
      </div>

      {isLoading && (
        <div className="loading-center"><div className="spinner" /></div>
      )}

      {error && (
        <div className="card">
          <div className="card-body">
            <p style={{ color: 'var(--danger)' }}>Failed to load projects. Is the API server running?</p>
          </div>
        </div>
      )}

      {projects && projects.length === 0 && (
        <div className="empty-state">
          <FolderKanban size={48} />
          <h3>No projects yet</h3>
          <p>Create your first project to start managing AD test campaigns.</p>
        </div>
      )}

      {projects && projects.length > 0 && (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Created</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/projects/${p.id}`}>{p.name}</Link></td>
                  <td><span className="badge badge-blue">{p.status}</span></td>
                  <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td>{new Date(p.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
