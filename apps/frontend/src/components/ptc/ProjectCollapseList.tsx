import { useState } from 'react';
import { Collapse, Spin } from 'antd';
import { usePtcOverviewProject } from '../../hooks/usePtcApi';
import TaskCard, { daysBetween } from './TaskCard';

interface ProjectCollapseListProps {
  projects: Array<{ project_id: string; name: string; task_count?: number }>;
  onTaskClick: (taskId: string) => void;
  filters?: Record<string, string | undefined>;
}

function ProjectPanelContent({
  projectId,
  isExpanded,
  onTaskClick,
  filters,
}: {
  projectId: string;
  isExpanded: boolean;
  onTaskClick: (taskId: string) => void;
  filters?: Record<string, string | undefined>;
}) {
  const { data, isLoading } = usePtcOverviewProject(projectId, isExpanded);

  if (!isExpanded) return null;
  if (isLoading) return <Spin />;

  let tasks = data?.tasks ?? [];
  if (filters?.task_id) {
    tasks = tasks.filter((t) => t.task_id === filters.task_id);
  }

  const sorted = [...tasks].sort((a, b) => {
    const aPub = a.binding_status === 'Published' ? 0 : 1;
    const bPub = b.binding_status === 'Published' ? 0 : 1;
    if (aPub !== bPub) return aPub - bPub;
    return (a.name ?? '').localeCompare(b.name ?? '');
  });

  const maxDays = sorted.reduce((max, t) => {
    if (t.start_date && t.end_date) {
      return Math.max(max, daysBetween(t.start_date, t.end_date));
    }
    return max;
  }, 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
      {sorted.map((t) => (
        <TaskCard key={t.task_id} task={t} onTaskClick={onTaskClick} maxDays={maxDays} />
      ))}
    </div>
  );
}

export default function ProjectCollapseList({
  projects,
  onTaskClick,
  filters,
}: ProjectCollapseListProps) {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  return (
    <Collapse
      className="ptc-project-collapse"
      activeKey={expandedKeys}
      onChange={(keys) => setExpandedKeys(Array.isArray(keys) ? keys : [keys])}
    >
      {projects.map((p) => {
        const displayCount = filters?.task_id ? 1 : p.task_count;
        return (
        <Collapse.Panel
          key={p.project_id}
          header={
            <span>
              {p.name}
              {displayCount != null && (
                <span style={{ marginLeft: 8, opacity: 0.7, fontSize: 13 }}>
                  ({displayCount} {displayCount === 1 ? 'task' : 'tasks'})
                </span>
              )}
            </span>
          }
        >
          <ProjectPanelContent
            projectId={p.project_id}
            isExpanded={expandedKeys.includes(p.project_id)}
            onTaskClick={onTaskClick}
            filters={filters}
          />
        </Collapse.Panel>
        );
      })}
    </Collapse>
  );
}
