import { useParams } from 'react-router-dom';
import { Descriptions, Tag, Card, Row, Col } from 'antd';
import { getRun } from '../api/client';
import { statusColor } from '../constants/colors';
import { FullPageSpinner, NotFoundState, GlassCardTitle, EntityLink } from '../components/shared';
import { useEntityDetail } from '../hooks/useEntityDetail';

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: run, isLoading } = useEntityDetail('run', id, getRun);

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (!run) {
    return <NotFoundState entity="Run" />;
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
            title={<GlassCardTitle>Run Overview</GlassCardTitle>}
            className="glass-panel"
          >
            <Descriptions column={{ xs: 1, sm: 2 }} size="small" colon={false}>
              <Descriptions.Item label="Run ID">
                <code style={{ color: '#818cf8', fontSize: 13 }}>{run.id}</code>
              </Descriptions.Item>
              <Descriptions.Item label="Task">
                {run.taskId ? (
                  <EntityLink to={`/tasks/${run.taskId}`} mono>{run.taskId}</EntityLink>
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
