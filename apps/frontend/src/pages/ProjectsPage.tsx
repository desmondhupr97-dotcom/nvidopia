import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Table, Tag, Button, Input, Empty, Space } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { FolderKanban } from 'lucide-react';
import { useState } from 'react';
import { getProjects } from '../api/client';
import type { Project } from '../api/client';
import type { ColumnsType } from 'antd/es/table';

const statusColor: Record<string, string> = {
  Planning: 'blue',
  Active: 'purple',
  Completed: 'green',
  Archived: 'default',
};

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
  });

  const filtered = projects?.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: ColumnsType<Project> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Project) => (
        <Link to={`/projects/${record.id}`} style={{ color: '#818cf8', fontWeight: 500 }}>
          {name}
        </Link>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => (
        <Tag color={statusColor[status] ?? 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (d: string) => new Date(d).toLocaleDateString(),
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
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Manage autonomous driving test projects</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large">
          New Project
        </Button>
      </div>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Input
          placeholder="Search projects..."
          prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 360 }}
        />

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
                  image={<FolderKanban size={48} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />}
                  description={<span style={{ color: 'var(--text-muted)' }}>No projects yet. Create your first project to get started.</span>}
                />
              ),
            }}
          />
        </div>
      </Space>
    </div>
  );
}
