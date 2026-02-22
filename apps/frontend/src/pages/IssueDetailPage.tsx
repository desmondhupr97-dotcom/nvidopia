import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  Card, Tag, Descriptions, Timeline, Button, Input, Form, Modal,
  Space, Row, Col, Spin, Alert, Divider, Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined, EnvironmentOutlined, LinkOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { AlertTriangle } from 'lucide-react';
import { getIssue, transitionIssue, triageIssue, getIssueTransitions } from '../api/client';

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

const STATUS_COLOR: Record<IssueStatus, string> = {
  New: 'blue', Triage: 'gold', Assigned: 'geekblue', InProgress: 'purple',
  Fixed: 'green', RegressionTracking: 'cyan', Closed: 'default', Reopened: 'orange', Rejected: 'red',
};

const SEVERITY_COLOR: Record<string, string> = {
  Trivial: 'green', Minor: 'gold', Major: 'orange', Critical: 'red',
  Low: 'blue', Medium: 'gold', High: 'orange', Blocker: 'red',
};

const TRANSITION_COLOR: Record<string, string> = {
  Triage: 'gold', Assigned: 'geekblue', InProgress: 'purple', Fixed: 'green',
  RegressionTracking: 'cyan', Closed: 'default', Reopened: 'orange', Rejected: 'red',
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

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
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

      {/* Issue header card */}
      <Card className="glass-panel" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <AlertTriangle size={24} style={{ color: '#6366f1' }} />
            <div>
              <h1 style={{ fontFamily: "'Orbitron', 'Exo 2', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
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
          <Descriptions.Item label="Takeover Type">{issue.takeover_type ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Assignee">{issue.assignee ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Module">{issue.module ?? '—'}</Descriptions.Item>
          {(issue.gps_lat != null && issue.gps_lng != null) && (
            <Descriptions.Item label={<><EnvironmentOutlined /> GPS</>}>
              <code>{Number(issue.gps_lat).toFixed(6)}, {Number(issue.gps_lng).toFixed(6)}</code>
            </Descriptions.Item>
          )}
          {issue.data_snapshot_uri && (
            <Descriptions.Item label="Snapshot">
              <a href={issue.data_snapshot_uri} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8' }}>
                View <LinkOutlined />
              </a>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Run">
            <code>{issue.run_id ? (issue.run_id as string).slice(0, 8) : '—'}</code>
          </Descriptions.Item>
          <Descriptions.Item label="Triggered At">
            {issue.trigger_timestamp ? new Date(issue.trigger_timestamp).toLocaleString() : '—'}
          </Descriptions.Item>
        </Descriptions>

        {issue.fault_codes && issue.fault_codes.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Fault Codes</div>
            <Space wrap>
              {issue.fault_codes.map((code: string) => (
                <Tag key={code} color="red" style={{ fontFamily: 'monospace' }}>{code}</Tag>
              ))}
            </Space>
          </div>
        )}

        {issue.environment_tags && issue.environment_tags.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Environment Tags</div>
            <Space wrap>
              {issue.environment_tags.map((tag: string) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </div>
        )}

        {(issue.triage_mode || issue.triage_hint) && (
          <Alert
            type="warning"
            style={{ marginTop: 16, borderRadius: 10 }}
            message="Triage Hints"
            description={
              <Space direction="vertical" size={4}>
                {issue.triage_mode && <span>Mode: <strong>{issue.triage_mode}</strong></span>}
                {issue.triage_hint && <span>Hint: <strong>{issue.triage_hint}</strong></span>}
              </Space>
            }
          />
        )}
      </Card>

      <Row gutter={[24, 24]}>
        {/* Transition panel */}
        {allowedNext.length > 0 && (
          <Col xs={24} lg={12}>
            <Card
              title={<span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600 }}>Transition</span>}
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

        {/* Audit trail */}
        <Col xs={24} lg={allowedNext.length > 0 ? 12 : 24}>
          <Card
            title={<span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600 }}>Audit Trail</span>}
            className="glass-panel"
          >
            {transitions?.items && transitions.items.length > 0 ? (
              <Timeline
                items={transitions.items.map((t: Record<string, unknown>) => ({
                  dot: <ClockCircleOutlined style={{ color: '#6366f1' }} />,
                  children: (
                    <div>
                      <Space size={4}>
                        <Tag color={STATUS_COLOR[t.from_status as IssueStatus] ?? 'default'} style={{ fontSize: 11 }}>
                          {t.from_status as string}
                        </Tag>
                        <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
                        <Tag color={STATUS_COLOR[t.to_status as IssueStatus] ?? 'default'} style={{ fontSize: 11 }}>
                          {t.to_status as string}
                        </Tag>
                      </Space>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        by <span style={{ color: 'var(--text-secondary)' }}>{t.triggered_by as string}</span>
                        {' at '}
                        {t.transitioned_at ? new Date(t.transitioned_at as string).toLocaleString() : '—'}
                      </div>
                      {Boolean(t.reason) && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                          &ldquo;{String(t.reason)}&rdquo;
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

      {/* Triage modal */}
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
