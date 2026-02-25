import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Tag, Button, Input, Empty, Space, Modal, Form, DatePicker,
  InputNumber, Select, message, Row, Col, Segmented, Progress,
} from 'antd';
import { PlusOutlined, SearchOutlined, AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { FolderKanban } from 'lucide-react';
import { useState, useMemo } from 'react';
import { getProjects, createProject } from '../api/client';
import type { Project } from '../api/client';
import type { ColumnsType } from 'antd/es/table';
import { statusColor } from '../constants/colors';
import PageHeader from '../components/shared/PageHeader';
import EntityLink from '../components/shared/EntityLink';

const STATUS_PILL_COLORS: Record<string, { bg: string; text: string }> = {
  Planning: { bg: '#E8F0FE', text: '#1A73E8' },
  Active: { bg: '#F3E8FF', text: '#7C3AED' },
  Completed: { bg: '#ECFDF5', text: '#059669' },
  Archived: { bg: '#F3F4F6', text: '#6B7280' },
  Frozen: { bg: '#E0F7FA', text: '#0097A7' },
};

function StatusPill({ status }: { status: string }) {
  const colors = STATUS_PILL_COLORS[status] ?? { bg: '#F3F4F6', text: '#6B7280' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 12px',
        borderRadius: 9999,
        fontSize: '0.75rem',
        fontWeight: 600,
        background: colors.bg,
        color: colors.text,
        lineHeight: '20px',
      }}
    >
      {status}
    </span>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const progressMap: Record<string, number> = {
    Planning: 15,
    Active: 55,
    Frozen: 40,
    Completed: 100,
    Archived: 100,
  };
  const pct = progressMap[project.status] ?? 30;

  return (
    <EntityLink to={`/projects/${project.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div className="ios-card ios-card-interactive" style={{ padding: 20, height: '100%', cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {project.name}
          </h3>
          <StatusPill status={project.status} />
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
          {project.vehicle_platform && (
            <div>
              <span style={{ fontWeight: 500 }}>Platform:</span> {project.vehicle_platform}
            </div>
          )}
          {project.soc_architecture && (
            <div>
              <span style={{ fontWeight: 500 }}>SoC:</span> {project.soc_architecture}
            </div>
          )}
          {project.description && (
            <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>{project.description}</div>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Progress</span>
            <span>{pct}%</span>
          </div>
          <Progress
            percent={pct}
            showInfo={false}
            strokeColor="#76B900"
            trailColor="#F0F0F0"
            size="small"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {project.target_mileage_km != null && (
              <span>{project.target_mileage_km.toLocaleString()} km target</span>
            )}
            {project.sensor_suite_version && (
              <span>Sensor {project.sensor_suite_version}</span>
            )}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {new Date(project.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </EntityLink>
  );
}

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
  });

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const projectId = `PROJ-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      return createProject({
        project_id: projectId,
        name: values.name as string,
        vehicle_platform: values.vehicle_platform as string,
        soc_architecture: values.soc_architecture as string,
        sensor_suite_version: values.sensor_suite_version as string,
        software_baseline_version: values.software_baseline_version as string,
        start_date: (values.start_date as { toISOString: () => string })?.toISOString(),
        target_mileage_km: values.target_mileage_km as number | undefined,
        status: (values.status as string) ?? 'Planning',
      } as Record<string, unknown> as Partial<Project>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setCreateOpen(false);
      form.resetFields();
      message.success('Project created');
    },
    onError: (err: Error) => {
      message.error(err.message || 'Failed to create project');
    },
  });

  const filtered = projects?.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    return true;
  });

  const stats = useMemo(() => {
    const all = projects ?? [];
    return {
      total: all.length,
      active: all.filter((p) => p.status === 'Active').length,
      completed: all.filter((p) => p.status === 'Completed').length,
      archived: all.filter((p) => p.status === 'Archived').length,
    };
  }, [projects]);

  const columns: ColumnsType<Project> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Project) => (
        <EntityLink to={`/projects/${record.id}`}>{name}</EntityLink>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => (
        <Tag color={statusColor[status] ?? 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Platform',
      dataIndex: 'vehicle_platform',
      key: 'vehicle_platform',
      width: 140,
      render: (v: string | undefined) => v ?? '—',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 140,
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
  ];

  const statCards = [
    { label: 'Total Projects', value: stats.total, color: '#76B900' },
    { label: 'Active', value: stats.active, color: '#7C3AED' },
    { label: 'Completed', value: stats.completed, color: '#059669' },
    { label: 'Archived', value: stats.archived, color: '#6B7280' },
  ];

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Manage autonomous driving test projects"
        action={
          <Button className="btn-primary-green" icon={<PlusOutlined />} size="large" onClick={() => setCreateOpen(true)}>
            New Project
          </Button>
        }
      />

      {/* Stats Row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {statCards.map((s) => (
          <Col xs={12} sm={6} key={s.label}>
            <div className="stat-card">
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Space wrap>
          <Input
            placeholder="Search projects..."
            prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 280 }}
          />
          <Select
            placeholder="Filter by status"
            allowClear
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            options={[
              { value: 'Planning', label: 'Planning' },
              { value: 'Active', label: 'Active' },
              { value: 'Frozen', label: 'Frozen' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Archived', label: 'Archived' },
            ]}
          />
        </Space>
        <Segmented
          value={viewMode}
          onChange={(v) => setViewMode(v as 'grid' | 'list')}
          options={[
            { value: 'grid', icon: <AppstoreOutlined /> },
            { value: 'list', icon: <UnorderedListOutlined /> },
          ]}
        />
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        (!filtered || filtered.length === 0) && !isLoading ? (
          <div className="ios-card" style={{ padding: 48, textAlign: 'center' }}>
            <Empty
              image={<FolderKanban size={48} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />}
              description={<span style={{ color: 'var(--text-muted)' }}>No projects yet. Create your first project to get started.</span>}
            />
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {(filtered ?? []).map((project) => (
              <Col xs={24} sm={12} lg={8} key={project.id}>
                <ProjectCard project={project} />
              </Col>
            ))}
          </Row>
        )
      ) : (
        <div className="ios-card" style={{ overflow: 'hidden' }}>
          <Table
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 15, showSizeChanger: false }}
            locale={{
              emptyText: (
                <Empty
                  image={<FolderKanban size={48} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />}
                  description={<span style={{ color: 'var(--text-muted)' }}>No projects yet. Create your first project to get started.</span>}
                />
              ),
            }}
          />
        </div>
      )}

      <Modal
        title="New Project"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="Create"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="name" label="Project Name" rules={[{ required: true, message: 'Please enter project name' }]}>
            <Input placeholder="e.g. V2.0 Urban Pilot" />
          </Form.Item>
          <Form.Item name="vehicle_platform" label="Vehicle Platform" rules={[{ required: true }]}>
            <Input placeholder="e.g. EP40" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="soc_architecture" label="SoC Architecture" rules={[{ required: true }]}>
              <Input placeholder="e.g. Orin-X Dual" />
            </Form.Item>
            <Form.Item name="sensor_suite_version" label="Sensor Suite Version" rules={[{ required: true }]}>
              <Input placeholder="e.g. SS-4.0" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="software_baseline_version" label="SW Baseline Version" rules={[{ required: true }]}>
              <Input placeholder="e.g. v3.1.0-rc1" />
            </Form.Item>
            <Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="target_mileage_km" label="Target Mileage (km)">
              <InputNumber min={0} style={{ width: '100%' }} placeholder="Optional" />
            </Form.Item>
            <Form.Item name="status" label="Initial Status" initialValue="Planning">
              <Select options={[
                { value: 'Planning', label: 'Planning' },
                { value: 'Active', label: 'Active' },
              ]} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
