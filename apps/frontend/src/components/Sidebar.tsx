import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Badge } from 'antd';
import type { MenuProps } from 'antd';
import {
  FolderKanban,
  ListChecks,
  Play,
  Bug,
  BarChart3,
  GitGraph,
  Sparkles,
  Monitor,
  Truck,
  MapPin,
  Route,
} from 'lucide-react';

type MenuItem = Required<MenuProps>['items'][number];

const iconStyle = { width: 16, height: 16, strokeWidth: 1.8 };

const mainItems: MenuItem[] = [
  { key: '/projects', icon: <FolderKanban {...iconStyle} />, label: 'Projects' },
  { key: '/tasks', icon: <ListChecks {...iconStyle} />, label: 'Tasks' },
  { key: '/runs', icon: <Play {...iconStyle} />, label: 'Runs' },
  { key: '/issues', icon: <Bug {...iconStyle} />, label: 'Issues' },
  { key: '/kpi', icon: <BarChart3 {...iconStyle} />, label: 'KPI Dashboard' },
  { key: '/traceability', icon: <GitGraph {...iconStyle} />, label: 'Traceability' },
];

const fleetItems: MenuItem[] = [
  { key: '/fleet', icon: <Truck {...iconStyle} />, label: 'Fleet Overview' },
  { key: '/fleet/trajectory', icon: <Route {...iconStyle} />, label: 'Trajectory' },
  { key: '/fleet/issues-map', icon: <MapPin {...iconStyle} />, label: 'Issue Map' },
];

const simulationItems: MenuItem[] = [
  { key: '/simulation', icon: <Monitor {...iconStyle} />, label: 'Simulation' },
];

const secondaryItems: MenuItem[] = [
  {
    key: '/auto-triage',
    icon: <Sparkles {...iconStyle} />,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        Auto-Triage
        <Badge
          count="WIP"
          style={{
            backgroundColor: 'var(--accent-soft)',
            color: 'var(--text-secondary)',
            fontSize: 9,
            fontWeight: 600,
            boxShadow: 'none',
            letterSpacing: '0.02em',
            fontFamily: 'var(--font-mono)',
            borderRadius: 6,
          }}
        />
      </span>
    ),
  },
];

const sectionLabelStyle: React.CSSProperties = {
  padding: '6px 24px 2px',
  fontSize: '0.68rem',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontFamily: 'var(--font-body)',
  fontWeight: 600,
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'var(--glass-border)',
  margin: '8px 16px',
};

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentKey = pathParts[0] === 'fleet' && pathParts.length > 1
    ? `/${pathParts[0]}/${pathParts[1]}`
    : '/' + pathParts[0];

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  return (
    <div className="glass-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="sidebar-brand">
        <div className="sidebar-logo">N</div>
        <span className="sidebar-title">Nvidopia</span>
      </div>

      <div style={{ flex: 1, paddingTop: 6, overflow: 'auto' }}>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[currentKey]}
          onClick={handleClick}
          items={mainItems}
          style={{ borderInlineEnd: 'none' }}
        />

        <div style={dividerStyle} />

        <div style={sectionLabelStyle}>Fleet</div>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[currentKey]}
          onClick={handleClick}
          items={fleetItems}
          style={{ borderInlineEnd: 'none' }}
        />

        <div style={dividerStyle} />

        <div style={sectionLabelStyle}>Simulation</div>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[currentKey]}
          onClick={handleClick}
          items={simulationItems}
          style={{ borderInlineEnd: 'none' }}
        />

        <div style={dividerStyle} />

        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[currentKey]}
          onClick={handleClick}
          items={secondaryItems}
          style={{ borderInlineEnd: 'none' }}
        />
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-footer-text">
          nvidopia <span style={{ color: 'var(--text-muted)' }}>v0.1</span>
        </div>
      </div>
    </div>
  );
}
