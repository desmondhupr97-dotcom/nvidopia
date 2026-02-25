import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Tag, Button, Input, Empty, Space, Select, Modal, Form,
  InputNumber, message, Row, Col, Segmented,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { ListChecks, LayoutGrid, List } from 'lucide-react';
import { useState, useMemo } from 'react';
import { getTasks, getProjects, createTask } from '../api/client';
import type { Task, Project } from '../api/client';
import type { ColumnsType } from 'antd/es/table';
import { stageColor, priorityColor } from '../constants/colors';
import PageHeader from '../components/shared/PageHeader';
import EntityLink from '../components/shared/EntityLink';
import EmptyDash from '../components/shared/EmptyDash';

const PRIORITY_PILL_COLORS: Record<string, { bg: string; text: string }> = {
  Critical: { bg: '#FEE2E2', text: '#DC2626' },
  High: { bg: '#FFF7ED', text: '#EA580C' },
  Medium: { bg: '#FFFBEB', text: '#D97706' },
  Low: { bg: '#EFF6FF', text: '#2563EB' },
};

const STAGE_PILL_COLORS: Record<string, { bg: string; text: string }> = {
  Pending: { bg: '#F3F4F6', text: '#6B7280' },
  InProgress: { bg: '#FFFBEB', text: '#D97706' },
  Completed: { bg: '#ECFDF5', text: '#059669' },
  Cancelled: { bg: '#F3F4F6', text: '#9CA3AF' },
};

const TYPE_PILL_COLORS: Record<string, { bg: string; text: string }> = {
  Daily: { bg: '#E8F0FE', text: '#1A73E8' },
  Smoke: { bg: '#E0F7FA', text: '#0097A7' },
  Gray: { bg: '#FFF3E0', text: '#E65100' },
  Freeze: { bg: '#F3E8FF', text: '#7C3AED' },
  Retest: { bg: '#FCE4EC', text: '#C62828' },
};

function PillBadge({ label, colors }: { label: string; colors: { bg: string; text: string } }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 9999,
        fontSize: '0.6875rem',
        fontWeight: 600,
        background: colors.bg,
        color: colors.text,
        lineHeight: '18px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

const KANBAN_COLUMNS = [
  { key: 'Pending', title: 'Pending', accent: '#6B7280' },
  { key: 'InProgress', title: 'In Progress', accent: '#D97706' },
  { key: 'Completed', title: 'Completed', accent: '#059669' },
  { key: 'Cancelled', title: 'Cancelled', accent: '#9CA3AF' },
];

function KanbanCard({ task, projectName }: { task: Task; projectName?: string }) {
  const priorityColors = PRIORITY_PILL_COLORS[task.priority] ?? { bg: '#F3F4F6', text: '#6B7280' };
  const typeColors = task.taskType
    ? TYPE_PILL_COLORS[task.taskType] ?? { bg: '#F3F4F6', text: '#6B7280' }
    : null;

  return (
    <EntityLink to={`/tasks/${task.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        className="ios-card ios-card-interactive"
        style={{ padding: 14, cursor: 'pointer', marginBottom: 10 }}
      >
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.4 }}>
          {task.title}
        </div>

        {projectName && (
          <div style={{ marginBottom: 8 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '1px 8px',
                borderRadius: 9999,
                fontSize: '0.6875rem',
                fontWeight: 500,
                background: '#F0FDF0',
                color: '#76B900',
                border: '1px solid #D4EDDA',
                lineHeight: '18px',
              }}
            >
              {projectName}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          <PillBadge label={task.priority} colors={priorityColors} />
          {typeColors && task.taskType && (
            <PillBadge label={task.taskType} colors={typeColors} />
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>{task.assignee ?? 'Unassigned'}</span>
          <span>{new Date(task.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </EntityLink>
  );
}

export default function TasksPage() {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks(),
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
  });

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const taskId = `TASK-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      return createTask({
        task_id: taskId,
        project_id: values.project_id as string,
        name: values.name as string,
        task_type: values.task_type as string,
        priority: (values.priority as string) ?? 'Medium',
        execution_region: values.execution_region as string | undefined,
        target_vehicle_count: values.target_vehicle_count as number | undefined,
      } as Record<string, unknown> as Partial<Task>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setCreateOpen(false);
      form.resetFields();
      message.success('Task created');
    },
    onError: (err: Error) => {
      message.error(err.message || 'Failed to create task');
    },
  });

  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    (projects ?? []).forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const filtered = tasks?.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (stageFilter && t.stage !== stageFilter) return false;
    return true;
  });

  const stats = useMemo(() => {
    const all = tasks ?? [];
    return {
      total: all.length,
      pending: all.filter((t) => t.stage === 'Pending').length,
      inProgress: all.filter((t) => t.stage === 'InProgress').length,
      completed: all.filter((t) => t.stage === 'Completed').length,
    };
  }, [tasks]);

  const kanbanGroups = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    for (const col of KANBAN_COLUMNS) groups[col.key] = [];
    for (const task of filtered ?? []) {
      const bucket = groups[task.stage] ?? groups['Pending'];
      bucket.push(task);
    }
    return groups;
  }, [filtered]);

  const columns: ColumnsType<Task> = [
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
      width: 130,
      render: (stage: string) => (
        <Tag color={stageColor[stage] ?? 'default'}>{stage}</Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 110,
      render: (priority: string) => (
        <Tag color={priorityColor[priority] ?? 'default'}>{priority}</Tag>
      ),
    },
    {
      title: 'Assignee',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 140,
      render: (v: string | undefined) => v ?? <EmptyDash />,
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 140,
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
  ];

  const statCards = [
    { label: 'Total Tasks', value: stats.total, color: '#76B900' },
    { label: 'Pending', value: stats.pending, color: '#6B7280' },
    { label: 'In Progress', value: stats.inProgress, color: '#D97706' },
    { label: 'Completed', value: stats.completed, color: '#059669' },
  ];

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Track test campaign tasks through their lifecycle"
        action={
          <Button className="btn-primary-green" icon={<PlusOutlined />} size="large" onClick={() => setCreateOpen(true)}>
            New Task
          </Button>
        }
      />

      {/* Stats Row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {statCards.map((s) => (
          <Col xs={12} sm={6} key={s.label}>
            <div className="stat-card">
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Space wrap>
          <Input
            placeholder="Search tasks..."
            prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 280 }}
          />
          <Select
            placeholder="Filter by status"
            allowClear
            value={stageFilter}
            onChange={setStageFilter}
            style={{ width: 160 }}
            options={[
              { value: 'Pending', label: 'Pending' },
              { value: 'InProgress', label: 'In Progress' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
          />
        </Space>
        <Segmented
          value={viewMode}
          onChange={(v) => setViewMode(v as 'kanban' | 'list')}
          options={[
            { value: 'kanban', icon: <LayoutGrid size={16} />, label: 'Kanban' },
            { value: 'list', icon: <List size={16} />, label: 'List' },
          ]}
        />
      </div>

      {/* Content */}
      {viewMode === 'kanban' ? (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = kanbanGroups[col.key] ?? [];
            return (
              <div
                key={col.key}
                style={{
                  flex: '1 1 0',
                  minWidth: 260,
                  background: '#F9FAFB',
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingLeft: 4 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 9999,
                      background: col.accent,
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {col.title}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 22,
                      height: 22,
                      borderRadius: 9999,
                      background: '#E5E7EB',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#6B7280',
                    }}
                  >
                    {colTasks.length}
                  </span>
                </div>

                <div style={{ flex: 1 }}>
                  {colTasks.length === 0 ? (
                    <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      No tasks
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        projectName={projectMap.get(task.projectId)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ios-card" style={{ overflow: 'hidden' }}>
          <Table
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 15, showSizeChanger: false }}
            locale={{
              emptyText: (
                <Empty
                  image={<ListChecks size={48} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />}
                  description={<span style={{ color: 'var(--text-muted)' }}>No tasks yet. Create tasks to plan and track your test activities.</span>}
                />
              ),
            }}
          />
        </div>
      )}

      <Modal
        title="New Task"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="Create"
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="project_id" label="Project" rules={[{ required: true, message: 'Please select a project' }]}>
            <Select
              placeholder="Select project"
              showSearch
              optionFilterProp="label"
              options={(projects ?? []).map((p) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>
          <Form.Item name="name" label="Task Name" rules={[{ required: true, message: 'Please enter task name' }]}>
            <Input placeholder="e.g. Highway Daily Mileage" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="task_type" label="Task Type" rules={[{ required: true, message: 'Please select type' }]}>
              <Select
                placeholder="Select type"
                options={[
                  { value: 'Daily', label: 'Daily' },
                  { value: 'Smoke', label: 'Smoke' },
                  { value: 'Gray', label: 'Gray' },
                  { value: 'Freeze', label: 'Freeze' },
                  { value: 'Retest', label: 'Retest' },
                ]}
              />
            </Form.Item>
            <Form.Item name="priority" label="Priority" initialValue="Medium">
              <Select options={[
                { value: 'Low', label: 'Low' },
                { value: 'Medium', label: 'Medium' },
                { value: 'High', label: 'High' },
                { value: 'Critical', label: 'Critical' },
              ]} />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="execution_region" label="Execution Region">
              <Input placeholder="e.g. Shanghai Lingang" />
            </Form.Item>
            <Form.Item name="target_vehicle_count" label="Target Vehicle Count">
              <InputNumber min={1} style={{ width: '100%' }} placeholder="Optional" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
