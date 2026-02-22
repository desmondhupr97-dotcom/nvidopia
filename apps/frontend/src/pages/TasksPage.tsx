import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Table, Tag, Button, Input, Empty, Space, Select } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { ListChecks } from 'lucide-react';
import { useState } from 'react';
import { getTasks } from '../api/client';
import type { Task } from '../api/client';
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
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks(),
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
        <Button type="primary" icon={<PlusOutlined />} size="large">
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
    </div>
  );
}
