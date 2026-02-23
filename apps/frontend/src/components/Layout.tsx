import { Outlet, useLocation, Link } from 'react-router-dom';
import { Layout as AntLayout, Breadcrumb } from 'antd';
import { Home } from 'lucide-react';
import Sidebar from './Sidebar';

const { Content } = AntLayout;

const routeLabels: Record<string, string> = {
  projects: 'Projects',
  tasks: 'Tasks',
  runs: 'Runs',
  issues: 'Issues',
  kpi: 'KPI Dashboard',
  traceability: 'Traceability',
  'auto-triage': 'Auto-Triage',
  simulation: 'Simulation',
  fleet: 'Fleet',
  vehicles: 'Vehicle',
  trajectory: 'Trajectory',
  'issues-map': 'Issue Map',
};

function BreadcrumbNav() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  const items = [
    { title: <Link to="/"><Home size={15} strokeWidth={2} /></Link> },
    ...segments.map((seg, i) => {
      const path = '/' + segments.slice(0, i + 1).join('/');
      const label = routeLabels[seg] ?? seg;
      const isLast = i === segments.length - 1;
      return {
        title: isLast ? <span>{label}</span> : <Link to={path}>{label}</Link>,
      };
    }),
  ];

  return <Breadcrumb items={items} />;
}

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      {/* Floating Sidebar */}
      <div
        style={{
          position: 'fixed',
          left: 16,
          top: 16,
          bottom: 16,
          width: 260,
          zIndex: 20,
        }}
      >
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div style={{ marginLeft: 292, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header
          className="glass-header"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            padding: '0 32px',
            height: 56,
          }}
        >
          <BreadcrumbNav />
        </header>

        {/* Content */}
        <Content style={{ padding: 32, minHeight: 'calc(100vh - 56px)' }}>
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </Content>
      </div>
    </div>
  );
}
