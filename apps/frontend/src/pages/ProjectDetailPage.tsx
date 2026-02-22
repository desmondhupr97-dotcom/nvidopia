import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Descriptions, Tag, Table, Card, Empty, Row, Col } from 'antd';
import { getProject, getTasks } from '../api/client';
import type { Task } from '../api/client';
import type { ColumnsType } from 'antd/es/table';
import { stageColor, priorityColor } from '../constants/colors';
import { FullPageSpinner, NotFoundState, PageHeader, GlassCardTitle, EntityLink, EmptyDash } from '../components/shared';
import { useEntityDetail } from '../hooks/useEntityDetail';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: project, isLoading: loadingProject } = useEntityDetail('project', id, getProject);

  const { data: tasks } = useQuery({
    queryKey: ['tasks', { projectId: id }],
    queryFn: () => getTasks({ projectId: id! }),
    enabled: !!id,
  });

  if (loadingProject) {
    return <FullPageSpinner />;
  }

  if (!project) {
    return <NotFoundState entity="Project" />;
  }

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
      title: 'Assignee',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 140,
      render: (v: string | undefined) => v ?? <EmptyDash />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={project.name}
        subtitle={project.description ?? 'No description'}
        action={<Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>{project.status}</Tag>}
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
          <Card
            title={<GlassCardTitle>Details</GlassCardTitle>}
            className="glass-panel"
          >
            <Descriptions column={1} size="small" colon={false}>
              <Descriptions.Item label="Status">
                <Tag color="blue">{project.status}</Tag>
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
