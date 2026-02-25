import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Tag, Button, Input, Empty, Space, Select } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Bug } from 'lucide-react';
import { getIssues } from '../api/client';
import type { Issue } from '../api/client';
import type { ColumnsType } from 'antd/es/table';
import { statusColor, severityColor } from '../constants/colors';
import PageHeader from '../components/shared/PageHeader';
import EntityLink from '../components/shared/EntityLink';
import EmptyDash from '../components/shared/EmptyDash';

const SEVERITY_DOT_COLOR: Record<string, string> = {
  Critical: '#FF3B30',
  Blocker:  '#FF3B30',
  High:     '#FF9500',
  Medium:   '#FFCC00',
  Low:      '#007AFF',
  Trivial:  '#8E8E93',
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

  const stats = useMemo(() => {
    if (!issues) return { open: 0, inProgress: 0, resolved: 0, total: 0 };
    const openStatuses = new Set(['New', 'Triage', 'Assigned', 'Reopened']);
    const inProgressStatuses = new Set(['InProgress']);
    const resolvedStatuses = new Set(['Fixed', 'Closed', 'Rejected', 'RegressionTracking']);
    return {
      open: issues.filter((i) => openStatuses.has(i.status)).length,
      inProgress: issues.filter((i) => inProgressStatuses.has(i.status)).length,
      resolved: issues.filter((i) => resolvedStatuses.has(i.status)).length,
      total: issues.length,
    };
  }, [issues]);

  const columns: ColumnsType<Issue> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: Issue) => (
        <EntityLink to={`/issues/${record.id}`}>{title}</EntityLink>
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
      width: 130,
      render: (severity: string) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: SEVERITY_DOT_COLOR[severity] ?? '#8E8E93',
              flexShrink: 0,
            }}
          />
          <Tag color={severityColor[severity] ?? 'default'} style={{ margin: 0 }}>{severity}</Tag>
        </span>
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

  return (
    <div>
      <PageHeader
        title="Issues"
        subtitle="Track defects and issues found during testing"
        action={
          <Button type="primary" icon={<PlusOutlined />} size="large" className="btn-primary-green">
            Report Issue
          </Button>
        }
      />

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="stat-card">
          <span className="stat-card-label">Open</span>
          <span className="stat-card-value" style={{ color: '#FF9500' }}>{stats.open}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">In Progress</span>
          <span className="stat-card-value" style={{ color: '#007AFF' }}>{stats.inProgress}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Resolved</span>
          <span className="stat-card-value" style={{ color: '#34C759' }}>{stats.resolved}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Total</span>
          <span className="stat-card-value">{stats.total}</span>
        </div>
      </div>

      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space wrap>
          <Input
            placeholder="Search issues..."
            prefix={<SearchOutlined style={{ color: '#8E8E93' }} />}
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

        <div className="ios-card" style={{ overflow: 'hidden' }}>
          <Table
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 15, showSizeChanger: false }}
            size="small"
            locale={{
              emptyText: (
                <Empty
                  image={<Bug size={48} style={{ color: '#8E8E93', opacity: 0.4 }} />}
                  description={<span style={{ color: '#8E8E93' }}>No issues reported. Issues from test runs will appear here.</span>}
                />
              ),
            }}
          />
        </div>
      </Space>
    </div>
  );
}
