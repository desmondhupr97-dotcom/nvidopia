import { useState, useMemo } from 'react';
import { Card, Select, Spin, Table, Empty } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { usePtcOverview, usePtcOverviewProject } from '../hooks/usePtcApi';
import type { PtcTaskSummary } from '../api/client';
import '../styles/ptc.css';

export default function PtcKpiPage() {
  const [selectedProject, setSelectedProject] = useState<string | undefined>();
  const { data: overview, isLoading: overviewLoading } = usePtcOverview();
  const { data: projectDetail, isLoading: detailLoading } = usePtcOverviewProject(
    selectedProject || '',
    !!selectedProject,
  );

  const publishedTasks = useMemo(() => {
    if (selectedProject && projectDetail && 'tasks' in projectDetail) {
      return (projectDetail.tasks as PtcTaskSummary[]).filter((t) => t.binding_status === 'Published');
    }
    return [];
  }, [selectedProject, projectDetail]);

  const aggregated = useMemo(() => {
    const totalMileage = publishedTasks.reduce((s, t) => s + t.total_mileage, 0);
    const totalCars = publishedTasks.reduce((s, t) => s + t.car_count, 0);
    const totalBuilds = publishedTasks.reduce((s, t) => s + t.build_count, 0);
    const totalHotlines = publishedTasks.reduce((s, t) => s + t.hotline_count, 0);
    const avgMileage = publishedTasks.length > 0 ? totalMileage / publishedTasks.length : 0;
    return { totalMileage, totalCars, totalBuilds, totalHotlines, avgMileage, taskCount: publishedTasks.length };
  }, [publishedTasks]);

  const chartData = useMemo(() =>
    publishedTasks.map((t) => ({
      name: t.name.length > 20 ? t.name.slice(0, 20) + '…' : t.name,
      mileage: Math.round(t.total_mileage),
      cars: t.car_count,
      hotlines: t.hotline_count,
    })),
  [publishedTasks]);

  const isLoading = overviewLoading || detailLoading;

  const projectOptions = Array.isArray(overview)
    ? overview.map((p: { project_id: string; name: string }) => ({ value: p.project_id, label: p.name }))
    : [];

  const columns = [
    { title: 'Task', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Mileage (km)', dataIndex: 'total_mileage', key: 'mileage', render: (v: number) => Math.round(v).toLocaleString() },
    { title: 'Cars', dataIndex: 'car_count', key: 'cars' },
    { title: 'Builds', dataIndex: 'build_count', key: 'builds' },
    { title: 'Tags', dataIndex: 'tag_count', key: 'tags' },
    { title: 'Hotlines', dataIndex: 'hotline_count', key: 'hotlines' },
    {
      title: 'Date Range',
      key: 'range',
      render: (_: unknown, r: PtcTaskSummary) =>
        r.start_date && r.end_date
          ? `${new Date(r.start_date).toLocaleDateString()} - ${new Date(r.end_date).toLocaleDateString()}`
          : '—',
    },
  ];

  return (
    <div className="ptc-page">
      <h2>PTC KPI</h2>

      <div style={{ marginBottom: 24 }}>
        <Select
          style={{ width: 300 }}
          placeholder="Select Project"
          showSearch
          allowClear
          value={selectedProject}
          onChange={setSelectedProject}
          filterOption={(input, option) =>
            (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
          }
          options={projectOptions}
        />
      </div>

      {isLoading ? (
        <Spin size="large" style={{ display: 'block', textAlign: 'center', marginTop: 60 }} />
      ) : !selectedProject ? (
        <Empty description="Select a project to view KPI" />
      ) : (
        <>
          <div className="ptc-kpi-grid">
            <Card className="ptc-kpi-card">
              <div className="stat-label">Published Tasks</div>
              <div className="stat-number">{aggregated.taskCount}</div>
            </Card>
            <Card className="ptc-kpi-card">
              <div className="stat-label">Total Mileage (km)</div>
              <div className="stat-number">{Math.round(aggregated.totalMileage).toLocaleString()}</div>
            </Card>
            <Card className="ptc-kpi-card">
              <div className="stat-label">Total Cars</div>
              <div className="stat-number">{aggregated.totalCars}</div>
            </Card>
            <Card className="ptc-kpi-card">
              <div className="stat-label">Total Builds</div>
              <div className="stat-number">{aggregated.totalBuilds}</div>
            </Card>
            <Card className="ptc-kpi-card">
              <div className="stat-label">Avg Mileage / Task</div>
              <div className="stat-number">{Math.round(aggregated.avgMileage).toLocaleString()}</div>
            </Card>
            <Card className="ptc-kpi-card">
              <div className="stat-label">Total Hotlines</div>
              <div className="stat-number">{aggregated.totalHotlines}</div>
            </Card>
          </div>

          {chartData.length > 0 && (
            <Card style={{ marginBottom: 24 }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="mileage" fill="#76b900" name="Mileage (km)" />
                  <Bar dataKey="cars" fill="#1890ff" name="Cars" />
                  <Bar dataKey="hotlines" fill="#ff4d4f" name="Hotlines" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          <Card title="Published Tasks Detail">
            <Table
              dataSource={publishedTasks}
              columns={columns}
              rowKey="task_id"
              pagination={{ pageSize: 20 }}
              size="small"
            />
          </Card>
        </>
      )}
    </div>
  );
}
