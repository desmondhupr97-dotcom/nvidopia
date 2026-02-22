import { Outlet, useLocation, Link } from 'react-router-dom';
import Sidebar from './Sidebar';

const routeLabels: Record<string, string> = {
  projects: 'Projects',
  tasks: 'Tasks',
  runs: 'Runs',
  issues: 'Issues',
  kpi: 'KPI Dashboard',
  traceability: 'Traceability',
  'auto-triage': 'Auto-Triage',
  simulation: 'Simulation',
};

function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs: Array<{ label: string; to: string }> = [];
  let path = '';
  for (const seg of segments) {
    path += `/${seg}`;
    const label = routeLabels[seg] ?? seg;
    crumbs.push({ label, to: path });
  }

  return (
    <div className="breadcrumbs">
      <Link to="/">Home</Link>
      {crumbs.map((c, i) => (
        <span key={c.to}>
          <span className="separator">/</span>
          {i === crumbs.length - 1 ? (
            <span>{c.label}</span>
          ) : (
            <Link to={c.to}>{c.label}</Link>
          )}
        </span>
      ))}
    </div>
  );
}

export default function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />

      <header className="app-header">
        <Breadcrumbs />
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
