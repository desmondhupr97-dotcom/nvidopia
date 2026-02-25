import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Table, Empty, Space, message } from 'antd';
import { getTask, getRuns, advanceTaskStage, getProject } from '../api/client';
import type { Run } from '../api/client';
import type { ColumnsType } from 'antd/es/table';
import { statusColor, stageColor, priorityColor } from '../constants/colors';
import { FullPageSpinner, NotFoundState, EntityLink, EmptyDash } from '../components/shared';
import { useEntityDetail } from '../hooks/useEntityDetail';

const TERMINAL_STATUSES = ['Completed', 'Cancelled'];

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
      render: (s: string) => <Tag color={statusColor[s] ?? 'default'} style={{ borderRadius: 9999 }}>{s}</Tag>,
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
    <div>
      {/* ── Task Header Card ─────────────────────────────── */}
      <div className="ios-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Tag color={stageColor[task.stage] ?? 'default'} style={{ fontSize: 12, borderRadius: 9999, padding: '2px 12px' }}>{task.stage}</Tag>
              <Tag color={priorityColor[task.priority] ?? 'default'} style={{ fontSize: 12, borderRadius: 9999, padding: '2px 12px' }}>{task.priority}</Tag>
            </div>
            <h1 style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: '1.35rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}>
              {task.title}
            </h1>
            {task.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>{task.description}</p>
            )}
          </div>
          {canAdvance && (
            <button
              className="btn-primary-green"
              disabled={advanceMutation.isPending}
              onClick={() => advanceMutation.mutate()}
            >
              {advanceMutation.isPending ? 'Advancing…' : 'Advance Stage →'}
            </button>
          )}
        </div>
      </div>

      {/* ── 65/35 Two-Column Layout ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

        {/* ─── Left: Test Runs ───────────────────────────── */}
        <div className="ios-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-secondary)' }}>
            <span style={SECTION_TITLE}>Test Runs</span>
          </div>
          <Table
            columns={runColumns}
            dataSource={runs}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: <Empty description="No runs executed yet" /> }}
          />
        </div>

        {/* ─── Right: Details Sidebar ────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="ios-card" style={{ padding: 20 }}>
            <span style={SECTION_TITLE}>Details</span>
            <dl style={{ margin: 0 }}>
              <PropRow label="Stage">
                <Tag color={stageColor[task.stage] ?? 'default'} style={{ borderRadius: 9999 }}>{task.stage}</Tag>
              </PropRow>
              <PropRow label="Task Type">
                {task.taskType ? <Tag style={{ borderRadius: 9999 }}>{task.taskType}</Tag> : '—'}
              </PropRow>
              <PropRow label="Priority">
                <Tag color={priorityColor[task.priority] ?? 'default'} style={{ borderRadius: 9999 }}>{task.priority}</Tag>
              </PropRow>
              <PropRow label="Project">
                {task.projectId ? (
                  <EntityLink to={`/projects/${task.projectId}`} style={{ color: 'var(--ios-blue)' }}>
                    {project?.name ?? task.projectId}
                  </EntityLink>
                ) : '—'}
              </PropRow>
              <PropRow label="Execution Region">{task.executionRegion ?? '—'}</PropRow>
              <PropRow label="Target Vehicles">
                {task.targetVehicleCount != null ? String(task.targetVehicleCount) : '—'}
              </PropRow>
            </dl>
          </div>

          <div className="ios-card" style={{ padding: 20 }}>
            <span style={SECTION_TITLE}>Timestamps</span>
            <dl style={{ margin: 0 }}>
              <PropRow label="Created">{new Date(task.createdAt).toLocaleString()}</PropRow>
              <PropRow label="Last Updated">{new Date(task.updatedAt).toLocaleString()}</PropRow>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
