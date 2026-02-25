import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Table, Empty, Button, Space, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getProject, getTasks, updateProject } from '../api/client';
import type { Task } from '../api/client';
import type { ColumnsType } from 'antd/es/table';
import { statusColor, stageColor, priorityColor } from '../constants/colors';
import { FullPageSpinner, NotFoundState, EntityLink, EmptyDash } from '../components/shared';
import { useEntityDetail } from '../hooks/useEntityDetail';

const PROJECT_STATUS_FLOW: Record<string, string[]> = {
  Planning: ['Active'],
  Active: ['Frozen', 'Completed'],
  Frozen: ['Active', 'Completed'],
  Completed: ['Archived'],
  Archived: [],
};

type TabKey = 'overview' | 'tasks';

const sectionTitle = (text: string) => (
  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
    {text}
  </span>
);

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-secondary)' }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right' }}>{children}</span>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const { data: project, isLoading: loadingProject } = useEntityDetail('project', id, getProject);

  const { data: tasks } = useQuery({
    queryKey: ['tasks', { projectId: id }],
    queryFn: () => getTasks({ projectId: id! }),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => updateProject(id!, { status: newStatus } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('Status updated');
    },
    onError: (err: Error) => message.error(err.message || 'Failed to update status'),
  });

  if (loadingProject) return <FullPageSpinner />;
  if (!project) return <NotFoundState entity="Project" />;

  const nextStatuses = PROJECT_STATUS_FLOW[project.status] ?? [];
  const taskCount = tasks?.length ?? 0;

  const taskColumns: ColumnsType<Task> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Task) => (
        <EntityLink to={`/tasks/${record.id}`}>{title}</EntityLink>
      ),
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      width: 120,
      render: (s: string) => <Tag color={stageColor[s] ?? 'default'}>{s}</Tag>,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 110,
      render: (p: string) => <Tag color={priorityColor[p] ?? 'default'}>{p}</Tag>,
    },
    {
      title: 'Type',
      dataIndex: 'taskType',
      key: 'taskType',
      width: 100,
      render: (v: string | undefined) => v ? <Tag>{v}</Tag> : <EmptyDash />,
    },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      {/* Back link */}
      <Link to="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', marginBottom: 20, fontSize: 13, fontWeight: 500 }}>
        <ArrowLeftOutlined /> Back to Projects
      </Link>

      {/* === Project Header Card === */}
      <div className="ios-card" style={{ padding: '24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              {project.name}
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              {project.description ?? 'No description'}
            </p>
          </div>
          <Space size={8} wrap>
            <Tag color={statusColor[project.status] ?? 'blue'} style={{ fontSize: 13, padding: '3px 14px', borderRadius: 9999 }}>
              {project.status}
            </Tag>
            {nextStatuses.map((s) => (
              <Button
                key={s}
                size="small"
                loading={statusMutation.isPending}
                onClick={() => statusMutation.mutate(s)}
                style={{ borderRadius: 9999, fontWeight: 500, borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
              >
                → {s}
              </Button>
            ))}
          </Space>
        </div>

        {/* Progress bar */}
        {taskCount > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Progress</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {tasks?.filter((t) => t.stage === 'GoLive' || t.stage === 'done').length ?? 0} / {taskCount} completed
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${((tasks?.filter((t) => t.stage === 'GoLive' || t.stage === 'done').length ?? 0) / taskCount) * 100}%`,
                  background: 'var(--brand-green)',
                  borderRadius: 3,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 32, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-secondary)' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{taskCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Tasks</div>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              {project.target_mileage_km != null ? project.target_mileage_km.toLocaleString() : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Target KM</div>
          </div>
        </div>
      </div>

      {/* === Internal Tab Navigation === */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {(['overview', 'tasks'] as const).map((tab) => (
          <button
            key={tab}
            className={`secondary-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' ? 'Overview' : `Tasks (${taskCount})`}
          </button>
        ))}
      </div>

      {/* === Tab Content === */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
          {/* Left: Tasks preview */}
          <div className="ios-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {sectionTitle('Tasks')}
              <button
                onClick={() => setActiveTab('tasks')}
                style={{ background: 'none', border: 'none', color: 'var(--brand-green)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              >
                View All
              </button>
            </div>
            <Table
              columns={taskColumns}
              dataSource={tasks?.slice(0, 5)}
              rowKey="id"
              pagination={false}
              locale={{ emptyText: <Empty description="No tasks for this project yet" /> }}
            />
          </div>

          {/* Right: Details */}
          <div className="ios-card" style={{ padding: '20px 24px' }}>
            {sectionTitle('Details')}
            <div style={{ marginTop: 12 }}>
              <PropertyRow label="Status">
                <Tag color={statusColor[project.status] ?? 'blue'} style={{ margin: 0 }}>{project.status}</Tag>
              </PropertyRow>
              <PropertyRow label="Vehicle Platform">
                {project.vehicle_platform ?? <EmptyDash />}
              </PropertyRow>
              <PropertyRow label="SoC Architecture">
                {project.soc_architecture ?? <EmptyDash />}
              </PropertyRow>
              <PropertyRow label="Sensor Suite">
                {project.sensor_suite_version ?? <EmptyDash />}
              </PropertyRow>
              <PropertyRow label="SW Baseline">
                {project.software_baseline_version ?? <EmptyDash />}
              </PropertyRow>
              <PropertyRow label="Target Mileage">
                {project.target_mileage_km != null
                  ? `${project.target_mileage_km.toLocaleString()} km`
                  : <EmptyDash />}
              </PropertyRow>
              <PropertyRow label="Start Date">
                {project.start_date
                  ? new Date(project.start_date).toLocaleDateString()
                  : <EmptyDash />}
              </PropertyRow>
              <PropertyRow label="Created">
                {new Date(project.createdAt).toLocaleString()}
              </PropertyRow>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Last Updated</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {new Date(project.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="ios-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-secondary)' }}>
            {sectionTitle('All Tasks')}
          </div>
          <Table
            columns={taskColumns}
            dataSource={tasks}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: <Empty description="No tasks for this project yet" /> }}
          />
        </div>
      )}
    </div>
  );
}
