import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Descriptions, Tag, Table, Card, Spin, Empty, Row, Col } from 'antd';
import { getProject, getTasks } from '../api/client';
import type { Task } from '../api/client';
import type { ColumnsType } from 'antd/es/table';

const stageColor: Record<string, string> = {
  Pending: 'default', Smoke: 'cyan', Gray: 'gold', Freeze: 'orange', GoLive: 'green',
  backlog: 'default', ready: 'blue', 'in-progress': 'gold', review: 'purple', done: 'green',
};

const priorityColor: Record<string, string> = {
  Critical: 'red', High: 'orange', Medium: 'gold', Low: 'blue',
  critical: 'red', high: 'orange', medium: 'gold', low: 'blue',
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id!),
    enabled: !!id,
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks', { projectId: id }],
    queryFn: () => getTasks({ projectId: id! }),
    enabled: !!id,
  });

  if (loadingProject) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  if (!project) {
    return <Empty description="Project not found" style={{ padding: 80 }} />;
  }

  const taskColumns: ColumnsType<Task> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Task) => (
        <Link to={`/tasks/${record.id}`} style={{ color: '#818cf8', fontWeight: 500 }}>{title}</Link>
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
      render: (v: string | undefined) => v ?? <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle">{project.description ?? 'No description'}</p>
        </div>
        <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>{project.status}</Tag>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={<span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600 }}>Tasks</span>}
            className="glass-panel"
            extra={<Link to="/tasks" style={{ color: '#818cf8', fontSize: 13 }}>View All</Link>}
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
            title={<span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600 }}>Details</span>}
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
