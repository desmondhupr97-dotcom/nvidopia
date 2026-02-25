import { Outlet, useLocation, Link } from 'react-router-dom';
import { Layout as AntLayout, Breadcrumb } from 'antd';
import { Home } from 'lucide-react';
import TopNav from './TopNav';
import SecondaryTabs from './SecondaryTabs';

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />
      <SecondaryTabs />

      <Content style={{ padding: '20px 24px', minHeight: 'calc(100vh - var(--header-height) - var(--secondary-tab-height))' }}>
        <div style={{ marginBottom: 16 }}>
          <BreadcrumbNav />
        </div>
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </Content>
    </div>
  );
}
