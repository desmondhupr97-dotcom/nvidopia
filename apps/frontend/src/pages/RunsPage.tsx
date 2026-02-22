import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Table, Tag, Empty } from 'antd';
import { Play } from 'lucide-react';
import { getRuns } from '../api/client';
import type { Run } from '../api/client';
import type { ColumnsType } from 'antd/es/table';

const statusColor: Record<string, string> = {
  Scheduled: 'blue',
  Active: 'gold',
  Completed: 'green',
  Aborted: 'red',
  pending: 'default',
  queued: 'blue',
  running: 'gold',
  passed: 'green',
  failed: 'red',
  cancelled: 'default',
};

export default function RunsPage() {
  const { data: runs, isLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: () => getRuns(),
  });

  const columns: ColumnsType<Run> = [
    {
      title: 'Run ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => (
        <Link to={`/runs/${id}`} style={{ color: '#818cf8', fontWeight: 500, fontFamily: 'monospace' }}>
          {id.slice(0, 8)}
        </Link>
      ),
    },
    {
      title: 'Task',
      dataIndex: 'taskId',
      key: 'taskId',
      width: 120,
      render: (taskId: string) =>
        taskId ? (
          <Link to={`/tasks/${taskId}`} style={{ fontFamily: 'monospace', color: '#94a3b8' }}>
            {taskId.slice(0, 8)}
          </Link>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>—</span>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={statusColor[status] ?? 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      width: 100,
      render: (v: string | undefined) => v ?? <span style={{ color: 'var(--text-muted)' }}>—</span>,
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
      render: (d: string | undefined) => d ? new Date(d).toLocaleString() : <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
    {
      title: 'Completed',
      dataIndex: 'completedAt',
      key: 'completedAt',
      width: 160,
      render: (d: string | undefined) => d ? new Date(d).toLocaleString() : <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Test Runs</h1>
        <p className="page-subtitle">Monitor and manage test execution runs</p>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
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
                image={<Play size={48} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />}
                description={<span style={{ color: 'var(--text-muted)' }}>No test runs yet. Runs will appear here once tasks are executed.</span>}
              />
            ),
          }}
        />
      </div>
    </div>
  );
}
