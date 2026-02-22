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
} from 'lucide-react';

type MenuItem = Required<MenuProps>['items'][number];

const iconStyle = { width: 18, height: 18, strokeWidth: 1.8 };

const mainItems: MenuItem[] = [
  { key: '/projects', icon: <FolderKanban {...iconStyle} />, label: 'Projects' },
  { key: '/tasks', icon: <ListChecks {...iconStyle} />, label: 'Tasks' },
  { key: '/runs', icon: <Play {...iconStyle} />, label: 'Runs' },
  { key: '/issues', icon: <Bug {...iconStyle} />, label: 'Issues' },
  { key: '/kpi', icon: <BarChart3 {...iconStyle} />, label: 'KPI Dashboard' },
  { key: '/traceability', icon: <GitGraph {...iconStyle} />, label: 'Traceability' },
];

const secondaryItems: MenuItem[] = [
  {
    key: '/auto-triage',
    icon: <Sparkles {...iconStyle} />,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        Auto-Triage
        <Badge count="Soon" style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 10, fontWeight: 600, boxShadow: 'none' }} />
      </span>
    ),
  },
  {
    key: '/simulation',
    icon: <Monitor {...iconStyle} />,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        Simulation
        <Badge count="Soon" style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 10, fontWeight: 600, boxShadow: 'none' }} />
      </span>
    ),
  },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentKey = '/' + location.pathname.split('/').filter(Boolean)[0];

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  return (
    <div className="glass-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="sidebar-brand">
        <div className="sidebar-logo animate-pulse-glow">N</div>
        <span className="sidebar-title">NVIDOPIA</span>
      </div>

      <div style={{ flex: 1, paddingTop: 8, overflow: 'auto' }}>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[currentKey]}
          onClick={handleClick}
          items={mainItems}
          style={{ borderInlineEnd: 'none' }}
        />

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 20px' }} />

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
        <div className="sidebar-footer-text">AD Testing Platform v0.1</div>
      </div>
    </div>
  );
}
