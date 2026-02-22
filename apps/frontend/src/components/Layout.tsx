import { Outlet, useLocation, Link } from 'react-router-dom';
import { Layout as AntLayout, Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';

const { Sider, Header, Content } = AntLayout;

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

function BreadcrumbNav() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  const items = [
    { title: <Link to="/"><HomeOutlined style={{ fontSize: 14 }} /></Link> },
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
    <AntLayout style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <Sider
        width={260}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
          overflow: 'auto',
        }}
      >
        <Sidebar />
      </Sider>

      <AntLayout style={{ marginLeft: 260 }}>
        <Header
          className="glass-header"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 9,
            display: 'flex',
            alignItems: 'center',
            padding: '0 28px',
            height: 64,
          }}
        >
          <BreadcrumbNav />
        </Header>

        <Content style={{ padding: '28px', minHeight: 'calc(100vh - 64px)' }}>
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
