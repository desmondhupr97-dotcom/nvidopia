import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Descriptions, Tag, Table, Card, Empty, Row, Col, Button, Space, message } from 'antd';
import { getTask, getRuns, advanceTaskStage, getProject } from '../api/client';
import type { Run } from '../api/client';
import type { ColumnsType } from 'antd/es/table';
import { statusColor, stageColor, priorityColor } from '../constants/colors';
import { FullPageSpinner, NotFoundState, GlassCardTitle, EntityLink, EmptyDash } from '../components/shared';
import { useEntityDetail } from '../hooks/useEntityDetail';

const TERMINAL_STATUSES = ['Completed', 'Cancelled'];

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useEntityDetail('task', id, getTask);

  const { data: runs } = useQuery({
    queryKey: ['runs', { taskId: id }],
    queryFn: () => getRuns({ taskId: id! }),
    enabled: !!id,
  });

  const { data: project } = useQuery({
    queryKey: ['project', task?.projectId],
    queryFn: () => getProject(task!.projectId),
    enabled: !!task?.projectId,
  });

  const advanceMutation = useMutation({
    mutationFn: () => advanceTaskStage(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      message.success('Status advanced');
    },
    onError: (err: Error) => message.error(err.message || 'Failed to advance status'),
  });

  if (isLoading) return <FullPageSpinner />;
  if (!task) return <NotFoundState entity="Task" />;

  const canAdvance = !TERMINAL_STATUSES.includes(task.stage);

  const runColumns: ColumnsType<Run> = [
    {
      title: 'Run ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => (
        <EntityLink to={`/runs/${id}`} mono>{id.slice(0, 8)}</EntityLink>
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
      render: (v: string | undefined) => v ?? <EmptyDash />,
    },
    {
      title: 'Started',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (d: string | undefined) => d ? new Date(d).toLocaleString() : <EmptyDash />,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">{task.title}</h1>
          <p className="page-subtitle">{task.description ?? 'No description'}</p>
        </div>
        <Space>
          <Tag color={stageColor[task.stage] ?? 'default'} style={{ fontSize: 13, padding: '3px 10px' }}>{task.stage}</Tag>
          <Tag color={priorityColor[task.priority] ?? 'default'} style={{ fontSize: 13, padding: '3px 10px' }}>{task.priority}</Tag>
          {canAdvance && (
            <Button
              size="small"
              loading={advanceMutation.isPending}
              onClick={() => advanceMutation.mutate()}
              style={{ borderColor: 'var(--glass-border-light)', color: 'var(--text-secondary)' }}
            >
              Advance Status →
            </Button>
          )}
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={<GlassCardTitle>Test Runs</GlassCardTitle>}
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
          <Card title={<GlassCardTitle>Details</GlassCardTitle>} className="glass-panel">
            <Descriptions column={1} size="small" colon={false}>
              <Descriptions.Item label="Status">
                <Tag color={stageColor[task.stage] ?? 'default'}>{task.stage}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Task Type">
                {task.taskType ? <Tag>{task.taskType}</Tag> : <EmptyDash />}
              </Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Tag color={priorityColor[task.priority] ?? 'default'}>{task.priority}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Project">
                {task.projectId ? (
                  <EntityLink to={`/projects/${task.projectId}`}>
                    {project?.name ?? task.projectId}
                  </EntityLink>
                ) : <EmptyDash />}
              </Descriptions.Item>
              <Descriptions.Item label="Execution Region">
                {task.executionRegion ?? <EmptyDash />}
              </Descriptions.Item>
              <Descriptions.Item label="Target Vehicles">
                {task.targetVehicleCount ?? <EmptyDash />}
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
