import { useLocation, useNavigate } from 'react-router-dom';

interface TabItem {
  path: string;
  label: string;
}

interface TabGroup {
  prefixes: string[];
  tabs: TabItem[];
}

const tabGroups: TabGroup[] = [
  {
    prefixes: ['/projects', '/tasks', '/runs', '/issues'],
    tabs: [
      { path: '/projects', label: 'Projects' },
      { path: '/tasks', label: 'Tasks' },
      { path: '/runs', label: 'Runs' },
      { path: '/issues', label: 'Issues' },
    ],
  },
  {
    prefixes: ['/fleet'],
    tabs: [
      { path: '/fleet', label: 'Fleet Overview' },
      { path: '/fleet/trajectory', label: 'Trajectory' },
      { path: '/fleet/issues-map', label: 'Issue Map' },
    ],
  },
  {
    prefixes: ['/kpi', '/traceability', '/auto-triage'],
    tabs: [
      { path: '/kpi', label: 'KPI Dashboard' },
      { path: '/traceability', label: 'Traceability' },
      { path: '/auto-triage', label: 'Auto-Triage' },
    ],
  },
  {
    prefixes: ['/simulation'],
    tabs: [
      { path: '/simulation', label: 'Simulation' },
    ],
  },
];

function findGroup(pathname: string): TabGroup | null {
  for (const group of tabGroups) {
    for (const prefix of group.prefixes) {
      if (pathname === prefix || pathname.startsWith(prefix + '/')) {
        return group;
      }
    }
  }
  return null;
}

function isTabActive(pathname: string, tabPath: string): boolean {
  if (tabPath === '/fleet') {
    return pathname === '/fleet' || pathname.startsWith('/fleet/vehicles');
  }
  return pathname === tabPath || pathname.startsWith(tabPath + '/');
}

export default function SecondaryTabs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const group = findGroup(pathname);

  if (!group || group.tabs.length <= 1) return null;

  return (
    <div className="secondary-tabs">
      {group.tabs.map((tab) => (
        <button
          key={tab.path}
          className={`secondary-tab${isTabActive(pathname, tab.path) ? ' active' : ''}`}
          onClick={() => navigate(tab.path)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
