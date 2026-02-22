import { NavLink } from 'react-router-dom';
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
import clsx from 'clsx';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
}

const mainNav: NavItem[] = [
  { to: '/projects', label: 'Projects', icon: <FolderKanban size={18} /> },
  { to: '/tasks', label: 'Tasks', icon: <ListChecks size={18} /> },
  { to: '/runs', label: 'Runs', icon: <Play size={18} /> },
  { to: '/issues', label: 'Issues', icon: <Bug size={18} /> },
  { to: '/kpi', label: 'KPI Dashboard', icon: <BarChart3 size={18} /> },
  { to: '/traceability', label: 'Traceability', icon: <GitGraph size={18} /> },
];

const secondaryNav: NavItem[] = [
  { to: '/auto-triage', label: 'Auto-Triage', icon: <Sparkles size={18} />, comingSoon: true },
  { to: '/simulation', label: 'Simulation', icon: <Monitor size={18} />, comingSoon: true },
];

export default function Sidebar() {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">N</div>
        <span className="sidebar-title">Nvidopia</span>
      </div>

      <nav className="sidebar-nav">
        <ul className="sidebar-nav-list">
          {mainNav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  clsx('sidebar-nav-link', isActive && 'active')
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="sidebar-separator" />

        <ul className="sidebar-nav-list">
          {secondaryNav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  clsx('sidebar-nav-link', isActive && 'active')
                }
              >
                {item.icon}
                <span>{item.label}</span>
                {item.comingSoon && (
                  <span className="badge badge-coming-soon">Coming Soon</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-text">AD Testing Platform</div>
      </div>
    </aside>
  );
}
