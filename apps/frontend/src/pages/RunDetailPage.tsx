import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Descriptions, Tag, Card, Spin, Empty, Row, Col } from 'antd';
import { getRun } from '../api/client';

const statusColor: Record<string, string> = {
  Scheduled: 'blue', Active: 'gold', Completed: 'green', Aborted: 'red',
  pending: 'default', queued: 'blue', running: 'gold', passed: 'green', failed: 'red',
};

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: run, isLoading } = useQuery({
    queryKey: ['run', id],
    queryFn: () => getRun(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  if (!run) {
    return <Empty description="Run not found" style={{ padding: 80 }} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Run {run.id.slice(0, 8)}</h1>
          <p className="page-subtitle">Detailed execution information</p>
        </div>
        <Tag color={statusColor[run.status] ?? 'default'} style={{ fontSize: 14, padding: '4px 12px' }}>{run.status}</Tag>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={<span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600 }}>Run Overview</span>}
            className="glass-panel"
          >
            <Descriptions column={{ xs: 1, sm: 2 }} size="small" colon={false}>
              <Descriptions.Item label="Run ID">
                <code style={{ color: '#818cf8', fontSize: 13 }}>{run.id}</code>
              </Descriptions.Item>
              <Descriptions.Item label="Task">
                {run.taskId ? (
                  <Link to={`/tasks/${run.taskId}`} style={{ color: '#818cf8', fontFamily: 'monospace' }}>{run.taskId}</Link>
                ) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColor[run.status] ?? 'default'}>{run.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Result">
                {run.result ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Vehicles">
                {run.vehicleIds?.length ?? 0}
              </Descriptions.Item>
              <Descriptions.Item label="Started">
                {run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Completed">
                {run.completedAt ? new Date(run.completedAt).toLocaleString() : '—'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
