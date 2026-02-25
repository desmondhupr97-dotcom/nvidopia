import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Table, Empty, Button, Space, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getTask, getRuns, advanceTaskStage, getProject } from '../api/client';
import type { Run } from '../api/client';
import type { ColumnsType } from 'antd/es/table';
import { statusColor, stageColor, priorityColor } from '../constants/colors';
import { FullPageSpinner, NotFoundState, EntityLink, EmptyDash } from '../components/shared';
import { useEntityDetail } from '../hooks/useEntityDetail';

const TERMINAL_STATUSES = ['Completed', 'Cancelled'];

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

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useEntityDetail('task', id, getTask);

  const { data: runs } = useQuery({
    queryKey: ['runs', { taskId: id }],
    queryFn: () => getRuns({ taskId: id! }),
    enabled: !!id,
  });

  const { data: project } = useQuery({
    queryKey: ['project', task?.projectId],
    queryFn: () => getProject(task!.projectId),
    enabled: !!task?.projectId,
  });

  const advanceMutation = useMutation({
    mutationFn: () => advanceTaskStage(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      message.success('Status advanced');
    },
    onError: (err: Error) => message.error(err.message || 'Failed to advance status'),
  });

  if (isLoading) return <FullPageSpinner />;
  if (!task) return <NotFoundState entity="Task" />;

  const canAdvance = !TERMINAL_STATUSES.includes(task.stage);

  const runColumns: ColumnsType<Run> = [
    {
      title: 'Run ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => (
        <EntityLink to={`/runs/${id}`} mono>{id.slice(0, 8)}</EntityLink>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: string) => <Tag color={statusColor[s] ?? 'default'}>{s}</Tag>,
    },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      width: 100,
      render: (v: string | undefined) => v ?? <EmptyDash />,
    },
    {
      title: 'Started',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (d: string | undefined) => d ? new Date(d).toLocaleString() : <EmptyDash />,
    },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      {/* Back link */}
      <Link to="/tasks" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', marginBottom: 20, fontSize: 13, fontWeight: 500 }}>
        <ArrowLeftOutlined /> Back to Tasks
      </Link>

      {/* === Task Header Card === */}
      <div className="ios-card" style={{ padding: '24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              {task.title}
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              {task.description ?? 'No description'}
            </p>
          </div>
          <Space size={8}>
            <Tag color={stageColor[task.stage] ?? 'default'} style={{ fontSize: 13, padding: '3px 14px', borderRadius: 9999 }}>{task.stage}</Tag>
            <Tag color={priorityColor[task.priority] ?? 'default'} style={{ fontSize: 13, padding: '3px 14px', borderRadius: 9999 }}>{task.priority}</Tag>
            {canAdvance && (
              <button
                className="btn-primary-green"
                onClick={() => advanceMutation.mutate()}
                disabled={advanceMutation.isPending}
              >
                {advanceMutation.isPending ? 'Advancing…' : 'Advance Stage →'}
              </button>
            )}
          </Space>
        </div>
      </div>

      {/* === Two-column layout === */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>

        {/* Left: Runs table */}
        <div className="ios-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-secondary)' }}>
            {sectionTitle('Test Runs')}
          </div>
          <Table
            columns={runColumns}
            dataSource={runs}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: <Empty description="No runs executed yet" /> }}
          />
        </div>

        {/* Right: Details sidebar */}
        <div className="ios-card" style={{ padding: '20px 24px' }}>
          {sectionTitle('Details')}
          <div style={{ marginTop: 12 }}>
            <PropertyRow label="Stage">
              <Tag color={stageColor[task.stage] ?? 'default'} style={{ margin: 0 }}>{task.stage}</Tag>
            </PropertyRow>
            <PropertyRow label="Task Type">
              {task.taskType ? <Tag style={{ margin: 0 }}>{task.taskType}</Tag> : <EmptyDash />}
            </PropertyRow>
            <PropertyRow label="Priority">
              <Tag color={priorityColor[task.priority] ?? 'default'} style={{ margin: 0 }}>{task.priority}</Tag>
            </PropertyRow>
            <PropertyRow label="Project">
              {task.projectId ? (
                <EntityLink to={`/projects/${task.projectId}`}>
                  {project?.name ?? task.projectId.slice(0, 8)}
                </EntityLink>
              ) : <EmptyDash />}
            </PropertyRow>
            <PropertyRow label="Execution Region">
              {task.executionRegion ?? <EmptyDash />}
            </PropertyRow>
            <PropertyRow label="Target Vehicles">
              {task.targetVehicleCount ?? <EmptyDash />}
            </PropertyRow>
            <PropertyRow label="Created">
              {new Date(task.createdAt).toLocaleString()}
            </PropertyRow>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Updated</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                {new Date(task.updatedAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
