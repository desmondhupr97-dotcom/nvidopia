import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Tag, Empty } from 'antd';
import { Play, CheckCircle2, XCircle, Loader2, MinusCircle } from 'lucide-react';
import { getRuns } from '../api/client';
import type { Run } from '../api/client';
import type { ColumnsType } from 'antd/es/table';
import { statusColor } from '../constants/colors';
import PageHeader from '../components/shared/PageHeader';
import EntityLink from '../components/shared/EntityLink';
import EmptyDash from '../components/shared/EmptyDash';

const STATUS_ICON: Record<string, React.ReactNode> = {
  Completed: <CheckCircle2 size={15} style={{ color: '#34C759', verticalAlign: 'middle', marginRight: 4 }} />,
  Aborted:   <XCircle size={15} style={{ color: '#FF3B30', verticalAlign: 'middle', marginRight: 4 }} />,
  Active:    <Loader2 size={15} style={{ color: '#007AFF', verticalAlign: 'middle', marginRight: 4 }} className="spin-icon" />,
  Scheduled: <MinusCircle size={15} style={{ color: '#8E8E93', verticalAlign: 'middle', marginRight: 4 }} />,
};

export default function RunsPage() {
  const { data: runs, isLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: () => getRuns(),
  });

  const stats = useMemo(() => {
    if (!runs) return { total: 0, running: 0, passed: 0, failed: 0 };
    return {
      total: runs.length,
      running: runs.filter((r) => r.status === 'Active' || r.status === 'running').length,
      passed: runs.filter((r) => r.result === 'passed' || r.result === 'pass' || r.status === 'Completed').length,
      failed: runs.filter((r) => r.result === 'failed' || r.result === 'fail' || r.status === 'Aborted').length,
    };
  }, [runs]);

  const barTotal = stats.passed + stats.failed || 1;

  const columns: ColumnsType<Run> = [
    {
      title: 'Run ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => (
        <EntityLink to={`/runs/${id}`} mono>
          {id.slice(0, 8)}
        </EntityLink>
      ),
    },
    {
      title: 'Task',
      dataIndex: 'taskId',
      key: 'taskId',
      width: 120,
      render: (taskId: string) =>
        taskId ? (
          <EntityLink to={`/tasks/${taskId}`} mono>
            {taskId.slice(0, 8)}
          </EntityLink>
        ) : (
          <EmptyDash />
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {STATUS_ICON[status] ?? null}
          <Tag color={statusColor[status] ?? 'default'} style={{ margin: 0 }}>{status}</Tag>
        </span>
      ),
    },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      width: 100,
      render: (v: string | undefined) => v ?? <EmptyDash />,
    },
    {
      title: 'Vehicles',
      dataIndex: 'vehicleIds',
      key: 'vehicles',
      width: 90,
      render: (ids: string[] | undefined) => ids?.length ?? 0,
    },
    {
      title: 'Started',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 160,
      render: (d: string | undefined) => d ? new Date(d).toLocaleString() : <EmptyDash />,
    },
    {
      title: 'Completed',
      dataIndex: 'completedAt',
      key: 'completedAt',
      width: 160,
      render: (d: string | undefined) => d ? new Date(d).toLocaleString() : <EmptyDash />,
    },
  ];

  return (
    <div>
      <PageHeader title="Test Runs" subtitle="Monitor and manage test execution runs" />

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <span className="stat-card-label">Total Runs</span>
          <span className="stat-card-value">{stats.total}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Running</span>
          <span className="stat-card-value" style={{ color: '#007AFF' }}>{stats.running}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Passed</span>
          <span className="stat-card-value" style={{ color: '#34C759' }}>{stats.passed}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Failed</span>
          <span className="stat-card-value" style={{ color: '#FF3B30' }}>{stats.failed}</span>
        </div>
      </div>

      {/* Table */}
      <div className="ios-card" style={{ overflow: 'hidden' }}>
        <Table
          columns={columns}
          dataSource={runs}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 15, showSizeChanger: false }}
          scroll={{ x: 900 }}
          locale={{
            emptyText: (
              <Empty
                image={<Play size={48} style={{ color: '#8E8E93', opacity: 0.4 }} />}
                description={<span style={{ color: '#8E8E93' }}>No test runs yet. Runs will appear here once tasks are executed.</span>}
              />
            ),
          }}
        />
      </div>

      {/* Result distribution bar */}
      {stats.total > 0 && (
        <div className="ios-card" style={{ marginTop: 16, padding: '14px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#86868B', marginBottom: 8, fontFamily: 'Inter, sans-serif' }}>
            Result Distribution
          </div>
          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: '#E5E5EA' }}>
            <div
              style={{
                width: `${(stats.passed / barTotal) * 100}%`,
                background: '#34C759',
                transition: 'width 0.4s ease',
              }}
            />
            <div
              style={{
                width: `${(stats.failed / barTotal) * 100}%`,
                background: '#FF3B30',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 12, color: '#86868B', fontFamily: 'Inter, sans-serif' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34C759', display: 'inline-block' }} />
              Passed {stats.passed}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF3B30', display: 'inline-block' }} />
              Failed {stats.failed}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
