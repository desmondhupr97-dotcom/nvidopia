import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  Card, Tag, Descriptions, Timeline, Button, Input, Form, Modal,
  Space, Row, Col, Alert, Divider, Tooltip, Tabs, Empty,
} from 'antd';
import {
  ArrowLeftOutlined, EnvironmentOutlined, LinkOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { AlertTriangle } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  getIssue, transitionIssue, triageIssue, getIssueTransitions,
  getIssueSnapshot, getIssueTimeSeries,
} from '../api/client';
import type { IssueTimeSeriesChannel } from '../api/client';
import { statusColor as STATUS_COLOR, severityColor as SEVERITY_COLOR, transitionColor as TRANSITION_COLOR } from '../constants/colors';
import { FullPageSpinner, GlassCardTitle } from '../components/shared';

const TS_LINE_COLORS = ['#818cf8', '#34d399', '#f472b6', '#fbbf24', '#60a5fa', '#f87171', '#a78bfa', '#22d3ee'];

function TimeSeriesChart({ channel }: { channel: IssueTimeSeriesChannel }) {
  const { chartData, valueKeys } = useMemo(() => {
    const keys = new Set<string>();
    const data = channel.data_points.map((pt) => {
      const row: Record<string, number> = { t: pt.t / 1000 };
      for (const [k, v] of Object.entries(pt.values)) {
        if (typeof v === 'number') {
          row[k] = v;
          keys.add(k);
        }
      }
      return row;
    });
    return { chartData: data, valueKeys: Array.from(keys) };
  }, [channel.data_points]);

  if (valueKeys.length === 0) {
    return <Empty description="No numeric data" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 11 }} unit="s" />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
        <RechartsTooltip
          contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
        />
        <Legend />
        {valueKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={TS_LINE_COLORS[i % TS_LINE_COLORS.length]}
            dot={false}
            strokeWidth={1.5}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

type IssueStatus = 'New' | 'Triage' | 'Assigned' | 'InProgress' | 'Fixed' | 'RegressionTracking' | 'Closed' | 'Reopened' | 'Rejected';

const VALID_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  New: ['Triage', 'Rejected'],
  Triage: ['Assigned', 'Rejected'],
  Assigned: ['InProgress'],
  InProgress: ['Fixed'],
  Fixed: ['RegressionTracking'],
  RegressionTracking: ['Closed', 'Reopened'],
  Reopened: ['InProgress'],
  Closed: [],
  Rejected: [],
};

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [triageOpen, setTriageOpen] = useState(false);
  const [triageForm] = Form.useForm();
  const [transitionReason, setTransitionReason] = useState('');

  const { data: issue, isLoading, error } = useQuery({
    queryKey: ['issue', id],
    queryFn: () => getIssue(id!),
    enabled: !!id,
  });

  const { data: transitions } = useQuery({
    queryKey: ['issue-transitions', id],
    queryFn: () => getIssueTransitions(id!),
    enabled: !!id,
  });

  const transitionMutation = useMutation({
    mutationFn: ({ toStatus, reason }: { toStatus: IssueStatus; reason?: string }) =>
      transitionIssue(id!, { to_status: toStatus, triggered_by: 'ui-user', reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
      queryClient.invalidateQueries({ queryKey: ['issue-transitions', id] });
      setTransitionReason('');
    },
  });

  const triageMutation = useMutation({
    mutationFn: (values: { assignee: string; module: string }) =>
      triageIssue(id!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
      queryClient.invalidateQueries({ queryKey: ['issue-transitions', id] });
      setTriageOpen(false);
      triageForm.resetFields();
    },
  });

  const { data: snapshot } = useQuery({
    queryKey: ['issue-snapshot', id],
    queryFn: () => getIssueSnapshot(id!),
    enabled: !!id,
  });

  const { data: timeSeriesChannels } = useQuery({
    queryKey: ['issue-timeseries', id],
    queryFn: () => getIssueTimeSeries(id!),
    enabled: !!id,
  });

  const channelsByType = useMemo(() => {
    if (!timeSeriesChannels) return {};
    const grouped: Record<string, IssueTimeSeriesChannel[]> = {};
    for (const ch of timeSeriesChannels) {
      const type = ch.channel_type || 'other';
      (grouped[type] ??= []).push(ch);
    }
    return grouped;
  }, [timeSeriesChannels]);

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (error || !issue) {
    return <Alert type="error" message="Failed to load issue" showIcon style={{ borderRadius: 12 }} />;
  }

  const currentStatus = issue.status as IssueStatus;
  const allowedNext = VALID_TRANSITIONS[currentStatus] ?? [];
  const isTriage = currentStatus === 'Triage';

  return (
    <div>
      <Link to="/issues" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', marginBottom: 20, fontSize: 13 }}>
        <ArrowLeftOutlined /> Back to Issues
      </Link>

      <Card className="glass-panel" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <AlertTriangle size={24} style={{ color: '#6366f1' }} />
            <div>
              <h1 style={{ fontFamily: "var(--font-mono)", fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Issue {(issue.id as string).slice(0, 12)}
              </h1>
              <code style={{ fontSize: 12, color: 'var(--text-muted)' }}>{issue.id}</code>
            </div>
          </div>
          <Space>
            <Tag color={SEVERITY_COLOR[issue.severity] ?? 'default'} style={{ fontSize: 13, padding: '2px 10px' }}>{issue.severity}</Tag>
            <Tag color={STATUS_COLOR[currentStatus] ?? 'default'} style={{ fontSize: 13, padding: '2px 10px' }}>{currentStatus}</Tag>
          </Space>
        </div>

        {issue.description && (
          <p style={{ marginTop: 16, color: 'var(--text-secondary)', fontSize: 14 }}>{issue.description}</p>
        )}

        <Divider style={{ borderColor: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />

        <Descriptions column={{ xs: 1, sm: 2, lg: 4 }} size="small" colon={false}>
          <Descriptions.Item label="Category">{issue.category ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Takeover Type">{issue.takeoverType ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Assignee">{issue.assignee ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Module">{issue.module ?? '—'}</Descriptions.Item>
          {(issue.gpsLat != null && issue.gpsLng != null) && (
            <Descriptions.Item label={<><EnvironmentOutlined /> GPS</>}>
              <code>{Number(issue.gpsLat).toFixed(6)}, {Number(issue.gpsLng).toFixed(6)}</code>
            </Descriptions.Item>
          )}
          {issue.dataSnapshotUri && (
            <Descriptions.Item label="Snapshot">
              <a href={issue.dataSnapshotUri} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8' }}>
                View <LinkOutlined />
              </a>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Run">
            <code>{issue.runId ? issue.runId.slice(0, 8) : '—'}</code>
          </Descriptions.Item>
          <Descriptions.Item label="Triggered At">
            {issue.triggerTimestamp ? new Date(issue.triggerTimestamp).toLocaleString() : '—'}
          </Descriptions.Item>
        </Descriptions>

        {issue.faultCodes && issue.faultCodes.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Fault Codes</div>
            <Space wrap>
              {issue.faultCodes.map((code) => (
                <Tag key={code} color="red" style={{ fontFamily: 'monospace' }}>{code}</Tag>
              ))}
            </Space>
          </div>
        )}

        {issue.environmentTags && issue.environmentTags.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Environment Tags</div>
            <Space wrap>
              {issue.environmentTags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </div>
        )}

        {(issue.triageMode || issue.triageHint) && (
          <Alert
            type="warning"
            style={{ marginTop: 16, borderRadius: 10 }}
            message="Triage Hints"
            description={
              <Space direction="vertical" size={4}>
                {issue.triageMode && <span>Mode: <strong>{issue.triageMode}</strong></span>}
                {issue.triageHint && <span>Hint: <strong>{issue.triageHint}</strong></span>}
              </Space>
            }
          />
        )}
      </Card>

      <Row gutter={[24, 24]}>
        {allowedNext.length > 0 && (
          <Col xs={24} lg={12}>
            <Card
              title={<GlassCardTitle>Transition</GlassCardTitle>}
              className="glass-panel"
            >
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
                Current: <Tag color={STATUS_COLOR[currentStatus]}>{currentStatus}</Tag> — Choose next state:
              </p>

              <Input
                placeholder="Reason (optional)"
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                style={{ marginBottom: 16, maxWidth: 400 }}
              />

              <Space wrap>
                {allowedNext.map((nextStatus) => {
                  if (isTriage && nextStatus === 'Assigned') {
                    return (
                      <Tooltip key={nextStatus} title="Assign owner and module">
                        <Button
                          type="primary"
                          onClick={() => setTriageOpen(true)}
                        >
                          Assign (Triage)
                        </Button>
                      </Tooltip>
                    );
                  }
                  return (
                    <Button
                      key={nextStatus}
                      onClick={() => transitionMutation.mutate({ toStatus: nextStatus, reason: transitionReason || undefined })}
                      loading={transitionMutation.isPending}
                      style={{
                        borderColor: 'rgba(255,255,255,0.15)',
                      }}
                    >
                      <Tag color={TRANSITION_COLOR[nextStatus]} style={{ margin: 0 }}>{nextStatus}</Tag>
                    </Button>
                  );
                })}
              </Space>

              {transitionMutation.isError && (
                <Alert type="error" message="Transition failed" style={{ marginTop: 12, borderRadius: 8 }} />
              )}
            </Card>
          </Col>
        )}

        <Col xs={24} lg={allowedNext.length > 0 ? 12 : 24}>
          <Card
            title={<GlassCardTitle>Audit Trail</GlassCardTitle>}
            className="glass-panel"
          >
            {transitions?.items && transitions.items.length > 0 ? (
              <Timeline
                items={transitions.items.map((t) => ({
                  dot: <ClockCircleOutlined style={{ color: '#6366f1' }} />,
                  children: (
                    <div>
                      <Space size={4}>
                        <Tag color={STATUS_COLOR[t.fromStatus] ?? 'default'} style={{ fontSize: 11 }}>
                          {t.fromStatus}
                        </Tag>
                        <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
                        <Tag color={STATUS_COLOR[t.toStatus] ?? 'default'} style={{ fontSize: 11 }}>
                          {t.toStatus}
                        </Tag>
                      </Space>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        by <span style={{ color: 'var(--text-secondary)' }}>{t.triggeredBy}</span>
                        {' at '}
                        {t.transitionedAt ? new Date(t.transitionedAt).toLocaleString() : '—'}
                      </div>
                      {t.reason && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                          &ldquo;{t.reason}&rdquo;
                        </div>
                      )}
                    </div>
                  ),
                }))}
              />
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No transitions recorded yet.</div>
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title={<GlassCardTitle>Vehicle Dynamics Snapshot</GlassCardTitle>}
        className="glass-panel"
        style={{ marginTop: 24 }}
      >
        {snapshot ? (
          <Descriptions column={{ xs: 1, sm: 2, lg: 4 }} size="small" colon={false}>
            <Descriptions.Item label="Speed (m/s)">
              {snapshot.speed_mps?.toFixed(2) ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Acceleration (m/s²)">
              {snapshot.acceleration_mps2?.toFixed(3) ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Lateral Accel (m/s²)">
              {snapshot.lateral_acceleration_mps2?.toFixed(3) ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Yaw Rate (°/s)">
              {snapshot.yaw_rate_dps?.toFixed(2) ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Heading (°)">
              {snapshot.heading_deg?.toFixed(2) ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Steering Angle (°)">
              {snapshot.steering_angle_deg?.toFixed(2) ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Throttle (%)">
              {snapshot.throttle_pct?.toFixed(1) ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Brake (bar)">
              {snapshot.brake_pressure_bar?.toFixed(2) ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Gear">
              {snapshot.gear ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Quaternion">
              {snapshot.quaternion
                ? `${snapshot.quaternion.w.toFixed(4)}, ${snapshot.quaternion.x.toFixed(4)}, ${snapshot.quaternion.y.toFixed(4)}, ${snapshot.quaternion.z.toFixed(4)}`
                : '—'}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Empty description="No snapshot data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      {timeSeriesChannels && timeSeriesChannels.length > 0 && (
        <Card
          title={<GlassCardTitle>Time-Series Data</GlassCardTitle>}
          className="glass-panel"
          style={{ marginTop: 24 }}
        >
          <Tabs
            items={Object.entries(channelsByType).map(([type, channels]) => ({
              key: type,
              label: <Tag>{type}</Tag>,
              children: (
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  {channels.map((ch) => (
                    <div key={ch.channel}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        {ch.channel}
                      </div>
                      <TimeSeriesChart channel={ch} />
                    </div>
                  ))}
                </Space>
              ),
            }))}
          />
        </Card>
      )}

      <Modal
        title="Triage Assignment"
        open={triageOpen}
        onCancel={() => setTriageOpen(false)}
        onOk={() => triageForm.submit()}
        confirmLoading={triageMutation.isPending}
        okText="Assign & Transition"
      >
        <Form
          form={triageForm}
          layout="vertical"
          onFinish={(values) => triageMutation.mutate(values)}
        >
          <Form.Item name="assignee" label="Assign To" rules={[{ required: true, message: 'Please enter assignee' }]}>
            <Input placeholder="Developer name" />
          </Form.Item>
          <Form.Item name="module" label="Module" rules={[{ required: true, message: 'Please enter module' }]}>
            <Input placeholder="e.g. perception, planning" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
