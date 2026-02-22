import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Table, Tag, Button, Input, Empty, Space, Select, Modal, Form, InputNumber, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { ListChecks } from 'lucide-react';
import { useState } from 'react';
import { getTasks, getProjects, createTask } from '../api/client';
import type { Task, Project } from '../api/client';
import type { ColumnsType } from 'antd/es/table';

const stageColor: Record<string, string> = {
  backlog: 'default',
  ready: 'blue',
  'in-progress': 'gold',
  review: 'purple',
  done: 'green',
  Pending: 'default',
  Smoke: 'cyan',
  Gray: 'gold',
  Freeze: 'orange',
  GoLive: 'green',
};

const priorityColor: Record<string, string> = {
  critical: 'red',
  high: 'orange',
  medium: 'gold',
  low: 'blue',
  Critical: 'red',
  High: 'orange',
  Medium: 'gold',
  Low: 'blue',
};

export default function TasksPage() {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
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

  const filtered = tasks?.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (stageFilter && t.stage !== stageFilter) return false;
    return true;
  });

  const columns: ColumnsType<Task> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Task) => (
        <Link to={`/tasks/${record.id}`} style={{ color: '#818cf8', fontWeight: 500 }}>
          {title}
        </Link>
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
      render: (v: string | undefined) => v ?? <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 140,
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">Track test campaign tasks through their lifecycle</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setCreateOpen(true)}>
          New Task
        </Button>
      </div>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
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
            placeholder="Filter by stage"
            allowClear
            value={stageFilter}
            onChange={setStageFilter}
            style={{ width: 160 }}
            options={[
              { value: 'Pending', label: 'Pending' },
              { value: 'Smoke', label: 'Smoke' },
              { value: 'Gray', label: 'Gray' },
              { value: 'Freeze', label: 'Freeze' },
              { value: 'GoLive', label: 'Go Live' },
            ]}
          />
        </Space>

        <div className="glass-panel" style={{ overflow: 'hidden' }}>
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
      </Space>

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
