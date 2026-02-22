import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Descriptions, Tag, Table, Card, Empty, Row, Col, Button, Space, message } from 'antd';
import { getProject, getTasks, updateProject } from '../api/client';
import type { Task } from '../api/client';
import type { ColumnsType } from 'antd/es/table';
import { statusColor, stageColor, priorityColor } from '../constants/colors';
import { FullPageSpinner, NotFoundState, PageHeader, GlassCardTitle, EntityLink, EmptyDash } from '../components/shared';
import { useEntityDetail } from '../hooks/useEntityDetail';

const PROJECT_STATUS_FLOW: Record<string, string[]> = {
  Planning: ['Active'],
  Active: ['Frozen', 'Completed'],
  Frozen: ['Active', 'Completed'],
  Completed: ['Archived'],
  Archived: [],
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: project, isLoading: loadingProject } = useEntityDetail('project', id, getProject);

  const { data: tasks } = useQuery({
    queryKey: ['tasks', { projectId: id }],
    queryFn: () => getTasks({ projectId: id! }),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => updateProject(id!, { status: newStatus } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('Status updated');
    },
    onError: (err: Error) => message.error(err.message || 'Failed to update status'),
  });

  if (loadingProject) return <FullPageSpinner />;
  if (!project) return <NotFoundState entity="Project" />;

  const nextStatuses = PROJECT_STATUS_FLOW[project.status] ?? [];

  const taskColumns: ColumnsType<Task> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Task) => (
        <EntityLink to={`/tasks/${record.id}`}>{title}</EntityLink>
      ),
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      width: 120,
      render: (s: string) => <Tag color={stageColor[s] ?? 'default'}>{s}</Tag>,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 110,
      render: (p: string) => <Tag color={priorityColor[p] ?? 'default'}>{p}</Tag>,
    },
    {
      title: 'Type',
      dataIndex: 'taskType',
      key: 'taskType',
      width: 100,
      render: (v: string | undefined) => v ? <Tag>{v}</Tag> : <EmptyDash />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={project.name}
        subtitle={project.description ?? 'No description'}
        action={
          <Space>
            <Tag color={statusColor[project.status] ?? 'blue'} style={{ fontSize: 14, padding: '4px 12px' }}>
              {project.status}
            </Tag>
            {nextStatuses.map((s) => (
              <Button
                key={s}
                size="small"
                loading={statusMutation.isPending}
                onClick={() => statusMutation.mutate(s)}
                style={{ borderColor: 'var(--glass-border-light)', color: 'var(--text-secondary)' }}
              >
                → {s}
              </Button>
            ))}
          </Space>
        }
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={<GlassCardTitle>Tasks</GlassCardTitle>}
            className="glass-panel"
            extra={<EntityLink to="/tasks" style={{ fontSize: 13 }}>View All</EntityLink>}
            styles={{ body: { padding: 0 } }}
          >
            <Table
              columns={taskColumns}
              dataSource={tasks}
              rowKey="id"
              pagination={false}
              locale={{ emptyText: <Empty description="No tasks for this project yet" /> }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={<GlassCardTitle>Details</GlassCardTitle>} className="glass-panel">
            <Descriptions column={1} size="small" colon={false}>
              <Descriptions.Item label="Status">
                <Tag color={statusColor[project.status] ?? 'blue'}>{project.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Vehicle Platform">
                {project.vehicle_platform ?? <EmptyDash />}
              </Descriptions.Item>
              <Descriptions.Item label="SoC Architecture">
                {project.soc_architecture ?? <EmptyDash />}
              </Descriptions.Item>
              <Descriptions.Item label="Sensor Suite">
                {project.sensor_suite_version ?? <EmptyDash />}
              </Descriptions.Item>
              <Descriptions.Item label="SW Baseline">
                {project.software_baseline_version ?? <EmptyDash />}
              </Descriptions.Item>
              <Descriptions.Item label="Target Mileage">
                {project.target_mileage_km != null
                  ? `${project.target_mileage_km.toLocaleString()} km`
                  : <EmptyDash />}
              </Descriptions.Item>
              <Descriptions.Item label="Start Date">
                {project.start_date
                  ? new Date(project.start_date).toLocaleDateString()
                  : <EmptyDash />}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {new Date(project.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Last Updated">
                {new Date(project.updatedAt).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
