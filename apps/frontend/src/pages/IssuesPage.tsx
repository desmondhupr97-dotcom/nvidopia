import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Table, Tag, Button, Input, Empty, Space, Select } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Bug } from 'lucide-react';
import { useState } from 'react';
import { getIssues } from '../api/client';
import type { Issue } from '../api/client';
import type { ColumnsType } from 'antd/es/table';

const statusColor: Record<string, string> = {
  New: 'blue',
  Triage: 'purple',
  Assigned: 'geekblue',
  InProgress: 'gold',
  Fixed: 'green',
  RegressionTracking: 'cyan',
  Closed: 'default',
  Reopened: 'orange',
  Rejected: 'red',
  open: 'blue',
  triaged: 'purple',
  'in-progress': 'gold',
  fixed: 'green',
  verified: 'cyan',
  closed: 'default',
  'wont-fix': 'red',
  duplicate: 'default',
};

const severityColor: Record<string, string> = {
  Blocker: 'red',
  Critical: 'red',
  High: 'orange',
  Medium: 'gold',
  Low: 'blue',
  Trivial: 'green',
  critical: 'red',
  high: 'orange',
  medium: 'gold',
  low: 'blue',
};

export default function IssuesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>();
  const [severityFilter, setSeverityFilter] = useState<string>();

  const { data: issues, isLoading } = useQuery({
    queryKey: ['issues'],
    queryFn: () => getIssues(),
  });

  const filtered = issues?.filter((issue) => {
    if (search && !issue.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && issue.status !== statusFilter) return false;
    if (severityFilter && issue.severity !== severityFilter) return false;
    return true;
  });

  const columns: ColumnsType<Issue> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: Issue) => (
        <Link to={`/issues/${record.id}`} style={{ color: '#818cf8', fontWeight: 500 }}>
          {title}
        </Link>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => (
        <Tag color={statusColor[status] ?? 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 110,
      render: (severity: string) => (
        <Tag color={severityColor[severity] ?? 'default'}>{severity}</Tag>
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
          <h1 className="page-title">Issues</h1>
          <p className="page-subtitle">Track defects and issues found during testing</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large">
          Report Issue
        </Button>
      </div>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space wrap>
          <Input
            placeholder="Search issues..."
            prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 280 }}
          />
          <Select
            placeholder="Status"
            allowClear
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            options={[
              { value: 'New', label: 'New' },
              { value: 'Triage', label: 'Triage' },
              { value: 'Assigned', label: 'Assigned' },
              { value: 'InProgress', label: 'In Progress' },
              { value: 'Fixed', label: 'Fixed' },
              { value: 'RegressionTracking', label: 'Regression' },
              { value: 'Closed', label: 'Closed' },
              { value: 'Reopened', label: 'Reopened' },
              { value: 'Rejected', label: 'Rejected' },
            ]}
          />
          <Select
            placeholder="Severity"
            allowClear
            value={severityFilter}
            onChange={setSeverityFilter}
            style={{ width: 140 }}
            options={[
              { value: 'Critical', label: 'Critical' },
              { value: 'High', label: 'High' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Low', label: 'Low' },
              { value: 'Trivial', label: 'Trivial' },
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
                  image={<Bug size={48} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />}
                  description={<span style={{ color: 'var(--text-muted)' }}>No issues reported. Issues from test runs will appear here.</span>}
                />
              ),
            }}
          />
        </div>
      </Space>
    </div>
  );
}
