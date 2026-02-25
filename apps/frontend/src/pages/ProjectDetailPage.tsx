import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Table, Empty, Button, Space, message } from 'antd';
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

const SECTION_TITLE: React.CSSProperties = {
  fontFamily: "'Sora', sans-serif",
  fontWeight: 600,
  fontSize: '0.95rem',
  color: 'var(--text-primary)',
  letterSpacing: '-0.01em',
};

const LABEL: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  marginBottom: 2,
};

const VALUE: React.CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: 500,
  color: 'var(--text-primary)',
};

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border-secondary)' }}>
      <dt style={LABEL}>{label}</dt>
      <dd style={{ ...VALUE, margin: 0 }}>{children}</dd>
    </div>
  );
}

type TabKey = 'overview' | 'tasks';

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
      render: (s: string) => <Tag color={stageColor[s] ?? 'default'} style={{ borderRadius: 9999 }}>{s}</Tag>,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 110,
      render: (p: string) => <Tag color={priorityColor[p] ?? 'default'} style={{ borderRadius: 9999 }}>{p}</Tag>,
    },
    {
      title: 'Type',
      dataIndex: 'taskType',
      key: 'taskType',
      width: 100,
      render: (v: string | undefined) => v ? <Tag style={{ borderRadius: 9999 }}>{v}</Tag> : <EmptyDash />,
    },
  ];

  const statusProgress: Record<string, number> = {
    Planning: 10,
    Active: 50,
    Frozen: 50,
    Completed: 90,
    Archived: 100,
  };
  const progress = statusProgress[project.status] ?? 0;

  return (
    <div>
      {/* ── Project Header Card ──────────────────────────── */}
      <div className="ios-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Tag color={statusColor[project.status] ?? 'blue'} style={{ fontSize: 12, borderRadius: 9999, padding: '2px 12px' }}>
                {project.status}
              </Tag>
              <Space size={4}>
                {nextStatuses.map((s) => (
                  <Button
                    key={s}
                    size="small"
                    loading={statusMutation.isPending}
                    onClick={() => statusMutation.mutate(s)}
                    style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)', borderRadius: 9999, fontSize: 12 }}
                  >
                    → {s}
                  </Button>
                ))}
              </Space>
            </div>
            <h1 style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}>
              {project.name}
            </h1>
            {project.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>{project.description}</p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Progress</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{progress}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg-deep)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--brand-green)',
              borderRadius: 3,
              transition: 'width 500ms cubic-bezier(0.16, 1, 0.3, 1)',
            }} />
          </div>
        </div>

        {/* Meta Stats Row */}
        <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
          <div style={{
            background: 'var(--bg-deep)', borderRadius: 10, padding: '10px 18px',
            border: '1px solid var(--border-secondary)', flex: 1, textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tasks</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{taskCount}</div>
          </div>
          <div style={{
            background: 'var(--bg-deep)', borderRadius: 10, padding: '10px 18px',
            border: '1px solid var(--border-secondary)', flex: 1, textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Platform</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{project.vehicle_platform ?? '—'}</div>
          </div>
          <div style={{
            background: 'var(--bg-deep)', borderRadius: 10, padding: '10px 18px',
            border: '1px solid var(--border-secondary)', flex: 1, textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mileage Target</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
              {project.target_mileage_km != null ? `${project.target_mileage_km.toLocaleString()} km` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ───────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['overview', 'tasks'] as TabKey[]).map((tab) => (
          <button
            key={tab}
            className={`secondary-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' ? 'Overview' : `Tasks (${taskCount})`}
          </button>
        ))}
      </div>

      {/* ── Tab Content ──────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="ios-card" style={{ padding: 20 }}>
            <span style={SECTION_TITLE}>Project Details</span>
            <dl style={{ margin: 0 }}>
              <PropRow label="Status">
                <Tag color={statusColor[project.status] ?? 'blue'} style={{ borderRadius: 9999 }}>{project.status}</Tag>
              </PropRow>
              <PropRow label="Vehicle Platform">{project.vehicle_platform ?? '—'}</PropRow>
              <PropRow label="SoC Architecture">{project.soc_architecture ?? '—'}</PropRow>
              <PropRow label="Sensor Suite">{project.sensor_suite_version ?? '—'}</PropRow>
              <PropRow label="SW Baseline">{project.software_baseline_version ?? '—'}</PropRow>
            </dl>
          </div>

          <div className="ios-card" style={{ padding: 20 }}>
            <span style={SECTION_TITLE}>Timeline</span>
            <dl style={{ margin: 0 }}>
              <PropRow label="Target Mileage">
                {project.target_mileage_km != null
                  ? `${project.target_mileage_km.toLocaleString()} km`
                  : '—'}
              </PropRow>
              <PropRow label="Start Date">
                {project.start_date
                  ? new Date(project.start_date).toLocaleDateString()
                  : '—'}
              </PropRow>
              <PropRow label="Created">
                {new Date(project.createdAt).toLocaleString()}
              </PropRow>
              <PropRow label="Last Updated">
                {new Date(project.updatedAt).toLocaleString()}
              </PropRow>
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="ios-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={SECTION_TITLE}>Tasks</span>
            <EntityLink to="/tasks" style={{ fontSize: 13, color: 'var(--ios-blue)' }}>View All</EntityLink>
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
