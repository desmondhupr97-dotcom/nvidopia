import { useParams } from 'react-router-dom';
import { Descriptions, Tag, Card, Row, Col } from 'antd';
import { getRun } from '../api/client';
import { statusColor } from '../constants/colors';
import { FullPageSpinner, NotFoundState, EntityLink } from '../components/shared';
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

  const labelStyle: React.CSSProperties = { color: 'var(--text-secondary)', fontWeight: 500 };
  const contentStyle: React.CSSProperties = { color: 'var(--text-primary)' };
  const cardTitle = (text: string): React.ReactNode => (
    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)' }}>{text}</span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Run {run.id.slice(0, 8)}</h1>
          <p className="page-subtitle">Detailed execution information</p>
        </div>
        <Tag color={statusColor[run.status] ?? 'default'} style={{ fontSize: 14, padding: '4px 12px' }}>{run.status}</Tag>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title={cardTitle('Run Overview')} className="ios-card">
            <Descriptions
              column={{ xs: 1, sm: 2 }}
              size="small"
              colon={false}
              labelStyle={labelStyle}
              contentStyle={contentStyle}
            >
              <Descriptions.Item label="Run ID">
                <code style={{ color: 'var(--brand-green)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>{run.id}</code>
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

        <Col xs={24} lg={8}>
          <Card title={cardTitle('Timeline')} className="ios-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ios-green)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Started</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                    {run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: run.completedAt ? 'var(--ios-blue)' : 'var(--text-muted)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Completed</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                    {run.completedAt ? new Date(run.completedAt).toLocaleString() : '—'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
