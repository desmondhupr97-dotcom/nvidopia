import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  Tag, Button, Input, Form, Modal,
  Space, Alert, Tooltip, Tabs, Empty,
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
import { statusColor as STATUS_COLOR, severityColor as SEVERITY_COLOR } from '../constants/colors';
import { FullPageSpinner } from '../components/shared';

const TS_LINE_COLORS = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#5AC8FA', '#FF3B30', '#FFCC00', '#6E6E73'];

const TRANSITION_BTN_CLASS: Record<string, string> = {
  Triage: 'btn-triage',
  Assigned: 'btn-assigned',
  InProgress: 'btn-in-progress',
  Fixed: 'btn-fixed',
  RegressionTracking: 'btn-regression',
  Closed: 'btn-closed',
  Reopened: 'btn-reopened',
  Rejected: 'btn-rejected',
};

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
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
        <XAxis dataKey="t" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} unit="s" />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
        <RechartsTooltip
          contentStyle={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-secondary)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-md)',
          }}
          labelStyle={{ color: 'var(--text-muted)' }}
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

const sectionTitle = (text: string) => (
  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
    {text}
  </span>
);

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-secondary)' }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{children}</span>
    </div>
  );
}

function SnapshotMetric({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px 8px' }}>
      <div style={{ fontSize: '1.125rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
    </div>
  );
}

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
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      {/* Back link */}
      <Link to="/issues" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', marginBottom: 20, fontSize: 13, fontWeight: 500 }}>
        <ArrowLeftOutlined /> Back to Issues
      </Link>

      {/* === Header Card === */}
      <div className="ios-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255, 59, 48, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} style={{ color: 'var(--ios-red)' }} />
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                Issue {(issue.id as string).slice(0, 12)}
              </h1>
              <code style={{ fontSize: 11, color: 'var(--text-muted)' }}>{issue.id}</code>
            </div>
          </div>
          <Space size={8}>
            <Tag color={SEVERITY_COLOR[issue.severity] ?? 'default'} style={{ fontSize: 13, padding: '2px 12px', borderRadius: 9999 }}>{issue.severity}</Tag>
            <Tag color={STATUS_COLOR[currentStatus] ?? 'default'} style={{ fontSize: 13, padding: '2px 12px', borderRadius: 9999 }}>{currentStatus}</Tag>
          </Space>
        </div>
      </div>

      {/* === Two-column layout: 65/35 === */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>

        {/* ── Left Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>

          {/* Description card */}
          {issue.description && (
            <div className="ios-card" style={{ padding: '20px 24px' }}>
              {sectionTitle('Description')}
              <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                {issue.description}
              </p>
            </div>
          )}

          {/* Triage Hints */}
          {(issue.triageMode || issue.triageHint) && (
            <div className="hint-box">
              <dl style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: 0 }}>
                <dt>Triage Hints</dt>
                {issue.triageMode && <dd>Mode: <strong>{issue.triageMode}</strong></dd>}
                {issue.triageHint && <dd>Hint: <strong>{issue.triageHint}</strong></dd>}
              </dl>
            </div>
          )}

          {/* Transition card */}
          {allowedNext.length > 0 && (
            <div className="ios-card" style={{ padding: '20px 24px' }}>
              {sectionTitle('Transition')}
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '12px 0 16px' }}>
                Current: <Tag color={STATUS_COLOR[currentStatus]}>{currentStatus}</Tag> — Choose next state:
              </p>

              <Input
                placeholder="Reason (optional)"
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                style={{ marginBottom: 16, maxWidth: 400, borderRadius: 8 }}
              />

              <Space wrap>
                {allowedNext.map((nextStatus) => {
                  if (isTriage && nextStatus === 'Assigned') {
                    return (
                      <Tooltip key={nextStatus} title="Assign owner and module">
                        <button
                          className="btn-primary-green"
                          onClick={() => setTriageOpen(true)}
                        >
                          Assign (Triage)
                        </button>
                      </Tooltip>
                    );
                  }
                  return (
                    <Button
                      key={nextStatus}
                      className={TRANSITION_BTN_CLASS[nextStatus] ?? ''}
                      onClick={() => transitionMutation.mutate({ toStatus: nextStatus, reason: transitionReason || undefined })}
                      loading={transitionMutation.isPending}
                      style={{ borderRadius: 9999, fontWeight: 500 }}
                    >
                      {nextStatus}
                    </Button>
                  );
                })}
              </Space>

              {transitionMutation.isError && (
                <Alert type="error" message="Transition failed" style={{ marginTop: 12, borderRadius: 8 }} />
              )}
            </div>
          )}

          {/* Audit Trail */}
          <div className="ios-card" style={{ padding: '20px 24px' }}>
            {sectionTitle('Audit Trail')}
            <div style={{ marginTop: 16 }}>
              {transitions?.items && transitions.items.length > 0 ? (
                <div>
                  {transitions.items.map((t, idx) => (
                    <div key={idx} className="audit-trail-item">
                      <div className="audit-trail-dot">
                        <ClockCircleOutlined />
                      </div>
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
                        <div className="audit-trail-meta">
                          by {t.triggeredBy}
                          {' · '}
                          {t.transitionedAt ? new Date(t.transitionedAt).toLocaleString() : '—'}
                        </div>
                        {t.reason && (
                          <div className="audit-trail-reason">
                            &ldquo;{t.reason}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No transitions recorded yet.</div>
              )}
            </div>
          </div>

          {/* Vehicle Dynamics Snapshot */}
          <div className="ios-card" style={{ padding: '20px 24px' }}>
            {sectionTitle('Vehicle Dynamics Snapshot')}
            {snapshot ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1, marginTop: 16, background: 'var(--border-secondary)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ background: 'var(--bg-surface)' }}>
                  <SnapshotMetric label="Speed (m/s)" value={snapshot.speed_mps?.toFixed(2)} />
                </div>
                <div style={{ background: 'var(--bg-surface)' }}>
                  <SnapshotMetric label="Accel (m/s²)" value={snapshot.acceleration_mps2?.toFixed(3)} />
                </div>
                <div style={{ background: 'var(--bg-surface)' }}>
                  <SnapshotMetric label="Lat Accel (m/s²)" value={snapshot.lateral_acceleration_mps2?.toFixed(3)} />
                </div>
                <div style={{ background: 'var(--bg-surface)' }}>
                  <SnapshotMetric label="Yaw (°/s)" value={snapshot.yaw_rate_dps?.toFixed(2)} />
                </div>
                <div style={{ background: 'var(--bg-surface)' }}>
                  <SnapshotMetric label="Heading (°)" value={snapshot.heading_deg?.toFixed(2)} />
                </div>
                <div style={{ background: 'var(--bg-surface)' }}>
                  <SnapshotMetric label="Steering (°)" value={snapshot.steering_angle_deg?.toFixed(2)} />
                </div>
                <div style={{ background: 'var(--bg-surface)' }}>
                  <SnapshotMetric label="Throttle (%)" value={snapshot.throttle_pct?.toFixed(1)} />
                </div>
                <div style={{ background: 'var(--bg-surface)' }}>
                  <SnapshotMetric label="Brake (bar)" value={snapshot.brake_pressure_bar?.toFixed(2)} />
                </div>
                <div style={{ background: 'var(--bg-surface)' }}>
                  <SnapshotMetric label="Gear" value={snapshot.gear} />
                </div>
                <div style={{ background: 'var(--bg-surface)', gridColumn: 'span 2' }}>
                  <SnapshotMetric
                    label="Quaternion"
                    value={snapshot.quaternion
                      ? `${snapshot.quaternion.w.toFixed(3)}, ${snapshot.quaternion.x.toFixed(3)}, ${snapshot.quaternion.y.toFixed(3)}, ${snapshot.quaternion.z.toFixed(3)}`
                      : null}
                  />
                </div>
              </div>
            ) : (
              <Empty description="No snapshot data" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 16 }} />
            )}
          </div>

          {/* Time Series Charts */}
          {timeSeriesChannels && timeSeriesChannels.length > 0 && (
            <div className="ios-card" style={{ padding: '20px 24px' }}>
              {sectionTitle('Time-Series Data')}
              <div style={{ marginTop: 16 }}>
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
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column (Properties Sidebar) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Properties card */}
          <div className="ios-card" style={{ padding: '20px 24px' }}>
            {sectionTitle('Properties')}
            <div style={{ marginTop: 12 }}>
              <PropertyRow label="Severity">
                <Tag color={SEVERITY_COLOR[issue.severity] ?? 'default'} style={{ margin: 0 }}>{issue.severity}</Tag>
              </PropertyRow>
              <PropertyRow label="Status">
                <Tag color={STATUS_COLOR[currentStatus] ?? 'default'} style={{ margin: 0 }}>{currentStatus}</Tag>
              </PropertyRow>
              <PropertyRow label="Assignee">
                {issue.assignee ?? '—'}
              </PropertyRow>
              <PropertyRow label="Module">
                {issue.module ?? '—'}
              </PropertyRow>
              <PropertyRow label="Category">
                {issue.category ?? '—'}
              </PropertyRow>
              <PropertyRow label="Takeover Type">
                {issue.takeoverType ?? '—'}
              </PropertyRow>
              {(issue.gpsLat != null && issue.gpsLng != null) && (
                <PropertyRow label="GPS">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <EnvironmentOutlined style={{ color: 'var(--ios-blue)', fontSize: 12 }} />
                    <code style={{ fontSize: 12 }}>{Number(issue.gpsLat).toFixed(6)}, {Number(issue.gpsLng).toFixed(6)}</code>
                  </span>
                </PropertyRow>
              )}
              <PropertyRow label="Triggered At">
                {issue.triggerTimestamp ? new Date(issue.triggerTimestamp).toLocaleString() : '—'}
              </PropertyRow>
              <PropertyRow label="Created">
                {issue.createdAt ? new Date(issue.createdAt).toLocaleString() : '—'}
              </PropertyRow>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Updated</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {issue.updatedAt ? new Date(issue.updatedAt).toLocaleString() : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Related items card */}
          <div className="ios-card" style={{ padding: '20px 24px' }}>
            {sectionTitle('Related')}
            <div style={{ marginTop: 12 }}>
              <PropertyRow label="Run">
                {issue.runId ? (
                  <Link to={`/runs/${issue.runId}`} style={{ color: 'var(--brand-green)', fontWeight: 500, fontSize: 13 }}>
                    {issue.runId.slice(0, 8)}…
                  </Link>
                ) : '—'}
              </PropertyRow>
              {issue.dataSnapshotUri && (
                <PropertyRow label="Snapshot">
                  <a href={issue.dataSnapshotUri} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ios-blue)', fontWeight: 500, fontSize: 13 }}>
                    View <LinkOutlined />
                  </a>
                </PropertyRow>
              )}
            </div>
          </div>

          {/* Fault Codes */}
          {issue.faultCodes && issue.faultCodes.length > 0 && (
            <div className="ios-card" style={{ padding: '20px 24px' }}>
              {sectionTitle('Fault Codes')}
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {issue.faultCodes.map((code) => (
                  <span key={code} className="chip chip-red">{code}</span>
                ))}
              </div>
            </div>
          )}

          {/* Environment Tags */}
          {issue.environmentTags && issue.environmentTags.length > 0 && (
            <div className="ios-card" style={{ padding: '20px 24px' }}>
              {sectionTitle('Environment Tags')}
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {issue.environmentTags.map((tag) => (
                  <span key={tag} className="chip chip-gray">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Attachments area */}
          <div className="ios-card" style={{ padding: '20px 24px' }}>
            {sectionTitle('Attachments')}
            <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>
              No attachments yet.
            </div>
          </div>
        </div>
      </div>

      {/* Triage Modal */}
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
