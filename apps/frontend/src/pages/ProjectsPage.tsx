import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Tag, Button, Input, Empty, Space, Modal, Form, DatePicker, InputNumber, Select, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { FolderKanban } from 'lucide-react';
import { useState } from 'react';
import { getProjects, createProject } from '../api/client';
import type { Project } from '../api/client';
import type { ColumnsType } from 'antd/es/table';
import { statusColor } from '../constants/colors';
import PageHeader from '../components/shared/PageHeader';
import EntityLink from '../components/shared/EntityLink';

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
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

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Manage autonomous driving test projects"
        action={
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setCreateOpen(true)}>
            New Project
          </Button>
        }
      />

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
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

        <div className="glass-panel" style={{ overflow: 'hidden' }}>
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
      </Space>

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
