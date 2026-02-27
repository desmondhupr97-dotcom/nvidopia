import { useState } from 'react';
import { Collapse, Spin } from 'antd';
import { usePtcOverviewProject } from '../../hooks/usePtcApi';
import TaskCard from './TaskCard';

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

  return (
    <>
      {tasks.map((t) => (
        <TaskCard key={t.task_id} task={t} onTaskClick={onTaskClick} />
      ))}
    </>
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
      {projects.map((p) => (
        <Collapse.Panel
          key={p.project_id}
          header={
            <span>
              {p.name}
              {p.task_count != null && (
                <span style={{ marginLeft: 8, opacity: 0.7, fontSize: 13 }}>
                  ({p.task_count} tasks)
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
      ))}
    </Collapse>
  );
}
