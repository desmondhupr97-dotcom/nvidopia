import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Descriptions, Tag, Table, Card, Spin, Empty, Row, Col } from 'antd';
import { getTask, getRuns } from '../api/client';
import type { Run } from '../api/client';
import type { ColumnsType } from 'antd/es/table';

const statusColor: Record<string, string> = {
  Scheduled: 'blue', Active: 'gold', Completed: 'green', Aborted: 'red',
  pending: 'default', queued: 'blue', running: 'gold', passed: 'green', failed: 'red', cancelled: 'default',
};

const stageColor: Record<string, string> = {
  Pending: 'default', Smoke: 'cyan', Gray: 'gold', Freeze: 'orange', GoLive: 'green',
};

const priorityColor: Record<string, string> = {
  Critical: 'red', High: 'orange', Medium: 'gold', Low: 'blue',
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => getTask(id!),
    enabled: !!id,
  });

  const { data: runs } = useQuery({
    queryKey: ['runs', { taskId: id }],
    queryFn: () => getRuns({ taskId: id! }),
    enabled: !!id,
  });

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  if (!task) {
    return <Empty description="Task not found" style={{ padding: 80 }} />;
  }

  const runColumns: ColumnsType<Run> = [
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
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: string) => <Tag color={statusColor[s] ?? 'default'}>{s}</Tag>,
    },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      width: 100,
      render: (v: string | undefined) => v ?? <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
    {
      title: 'Started',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (d: string | undefined) => d ? new Date(d).toLocaleString() : <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">{task.title}</h1>
          <p className="page-subtitle">{task.description ?? 'No description'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tag color={stageColor[task.stage] ?? 'default'} style={{ fontSize: 13, padding: '3px 10px' }}>{task.stage}</Tag>
          <Tag color={priorityColor[task.priority] ?? 'default'} style={{ fontSize: 13, padding: '3px 10px' }}>{task.priority}</Tag>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={<span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600 }}>Test Runs</span>}
            className="glass-panel"
            styles={{ body: { padding: 0 } }}
          >
            <Table
              columns={runColumns}
              dataSource={runs}
              rowKey="id"
              pagination={false}
              locale={{ emptyText: <Empty description="No runs executed yet" /> }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={<span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600 }}>Details</span>}
            className="glass-panel"
          >
            <Descriptions column={1} size="small" colon={false}>
              <Descriptions.Item label="Stage">
                <Tag color={stageColor[task.stage] ?? 'default'}>{task.stage}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Tag color={priorityColor[task.priority] ?? 'default'}>{task.priority}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Assignee">
                {task.assignee ?? 'Unassigned'}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {new Date(task.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Updated">
                {new Date(task.updatedAt).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
