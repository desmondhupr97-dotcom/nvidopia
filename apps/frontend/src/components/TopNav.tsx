import { useLocation, useNavigate } from 'react-router-dom';
import { Dropdown, Avatar } from 'antd';
import type { MenuProps } from 'antd';
import { Search, Bell, ChevronDown } from 'lucide-react';

interface NavGroup {
  label: string;
  key: string;
  paths: string[];
  items: { path: string; label: string }[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Core',
    key: 'core',
    paths: ['/projects', '/tasks', '/runs', '/issues'],
    items: [
      { path: '/projects', label: 'Projects' },
      { path: '/tasks', label: 'Tasks' },
      { path: '/runs', label: 'Runs' },
      { path: '/issues', label: 'Issues' },
    ],
  },
  {
    label: 'Fleet',
    key: 'fleet',
    paths: ['/fleet'],
    items: [
      { path: '/fleet', label: 'Fleet Overview' },
      { path: '/fleet/trajectory', label: 'Trajectory' },
      { path: '/fleet/issues-map', label: 'Issue Map' },
    ],
  },
  {
    label: 'Analytics',
    key: 'analytics',
    paths: ['/kpi', '/traceability', '/auto-triage'],
    items: [
      { path: '/kpi', label: 'KPI Dashboard' },
      { path: '/traceability', label: 'Traceability' },
      { path: '/auto-triage', label: 'Auto-Triage' },
    ],
  },
  {
    label: 'Simulation',
    key: 'simulation',
    paths: ['/simulation'],
    items: [
      { path: '/simulation', label: 'Simulation' },
    ],
  },
];

function getActiveGroup(pathname: string): string | null {
  for (const g of navGroups) {
    if (g.paths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return g.key;
    }
  }
  return null;
}

export default function TopNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeGroup = getActiveGroup(pathname);

  return (
    <nav className="topnav">
      <div className="topnav-logo">N</div>
      <span className="topnav-title">Nvidopia</span>

      <div className="topnav-nav">
        {navGroups.map((group) => {
          const isActive = activeGroup === group.key;

          if (group.items.length === 1) {
            const item = group.items[0];
            return (
              <button
                key={group.key}
                className={`topnav-item${isActive ? ' active' : ''}`}
                onClick={() => item && navigate(item.path)}
              >
                {group.label}
              </button>
            );
          }

          const menuItems: MenuProps['items'] = group.items.map((item) => ({
            key: item.path,
            label: item.label,
            onClick: () => navigate(item.path),
          }));

          return (
            <Dropdown key={group.key} menu={{ items: menuItems }} placement="bottomLeft">
              <button className={`topnav-item${isActive ? ' active' : ''}`}>
                {group.label}
                <ChevronDown size={14} style={{ marginLeft: 4, opacity: 0.5 }} />
              </button>
            </Dropdown>
          );
        })}
      </div>

      <div className="topnav-right">
        <button className="topnav-icon-btn" title="Search (Cmd+K)">
          <Search size={18} />
        </button>
        <button className="topnav-icon-btn" title="Notifications">
          <Bell size={18} />
        </button>
        <Avatar
          size={32}
          style={{ background: 'var(--brand-green)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
        >
          U
        </Avatar>
      </div>
    </nav>
  );
}
