import { useQuery } from '@tanstack/react-query';
import { Table, Tag, Empty } from 'antd';
import { Play } from 'lucide-react';
import { getRuns } from '../api/client';
import type { Run } from '../api/client';
import type { ColumnsType } from 'antd/es/table';
import { statusColor } from '../constants/colors';
import PageHeader from '../components/shared/PageHeader';
import EntityLink from '../components/shared/EntityLink';
import EmptyDash from '../components/shared/EmptyDash';

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
