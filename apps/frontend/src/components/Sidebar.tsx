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

const iconStyle = { width: 14, height: 14, strokeWidth: 1.8 };

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
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        Auto-Triage
        <Badge count="WIP" style={{ backgroundColor: 'rgba(0,255,65,0.1)', color: '#00FF41', fontSize: 8, fontWeight: 600, boxShadow: 'none', letterSpacing: '0.04em', fontFamily: "var(--font-mono)" }} />
      </span>
    ),
  },
];

const sectionLabelStyle: React.CSSProperties = {
  padding: '2px 20px 2px',
  fontSize: 9,
  color: '#00FF41',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  fontFamily: "var(--font-mono)",
  fontWeight: 600,
  opacity: 0.5,
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'rgba(0,255,65,0.06)',
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
    <div className="glass-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="sidebar-brand">
        <div className="sidebar-logo">N</div>
        <span className="sidebar-title">NVIDOPIA</span>
      </div>

      <div style={{ flex: 1, paddingTop: 4, overflow: 'auto' }}>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[currentKey]}
          onClick={handleClick}
          items={mainItems}
          style={{ borderInlineEnd: 'none' }}
        />

        <div style={dividerStyle} />

        <div style={sectionLabelStyle}>// fleet</div>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[currentKey]}
          onClick={handleClick}
          items={fleetItems}
          style={{ borderInlineEnd: 'none' }}
        />

        <div style={dividerStyle} />

        <div style={sectionLabelStyle}>// simulation</div>
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
          <span style={{ color: '#00FF41' }}>$</span> nvidopia <span style={{ color: '#3d6b3d' }}>v0.1</span>
        </div>
      </div>
    </div>
  );
}
