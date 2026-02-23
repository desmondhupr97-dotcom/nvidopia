import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Select, DatePicker, Button, Space, Tag, Empty, Spin } from 'antd';
import dayjs from 'dayjs';
import PageHeader from '../components/shared/PageHeader';
import MapContainer from '../components/map/MapContainer';
import TrajectoryPolyline from '../components/map/TrajectoryPolyline';
import { DRIVING_MODE_COLORS } from '../components/map/drivingModeColors';
import {
  queryTrajectory,
  getProjects,
  getTasks,
  getRuns,
  getVehicles,
} from '../api/client';

const { RangePicker } = DatePicker;

export default function TrajectoryMapPage() {
  const [projectId, setProjectId] = useState<string>();
  const [taskId, setTaskId] = useState<string>();
  const [runId, setRunId] = useState<string>();
  const [vin, setVin] = useState<string>();
  const [timeRange, setTimeRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [queryParams, setQueryParams] = useState<Record<string, string | undefined>>();

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => getProjects() });
  const { data: tasks } = useQuery({ queryKey: ['tasks', projectId], queryFn: () => getTasks(projectId ? { projectId } : undefined) });
  const { data: runs } = useQuery({ queryKey: ['runs', taskId], queryFn: () => getRuns(taskId ? { taskId } : undefined) });
  const { data: vehicles } = useQuery({ queryKey: ['vehicles-list'], queryFn: () => getVehicles() });

  const { data: trajectory, isLoading } = useQuery({
    queryKey: ['trajectory', queryParams],
    queryFn: () => queryTrajectory(queryParams),
    enabled: !!queryParams,
  });

  const handleSearch = () => {
    const params: Record<string, string | undefined> = {};
    if (vin) params.vin = vin;
    if (runId) params.run_id = runId;
    else if (taskId) params.task_id = taskId;
    else if (projectId) params.project_id = projectId;
    if (timeRange) {
      params.start_time = timeRange[0].toISOString();
      params.end_time = timeRange[1].toISOString();
    }
    setQueryParams(params);
  };

  const points = trajectory?.data ?? [];

  const midPoint = points.length > 0 ? points[Math.floor(points.length / 2)] : undefined;
  const center: [number, number] | undefined = midPoint
    ? [midPoint.location.lat, midPoint.location.lng]
    : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader title="Trajectory Query" subtitle="Vehicle trajectory by project/task/run/vin" />

      <Card size="small" className="glass-card">
        <Space wrap size="middle">
          <Select allowClear placeholder="Project" style={{ width: 180 }} value={projectId} onChange={(v) => { setProjectId(v); setTaskId(undefined); setRunId(undefined); }}
            options={(projects ?? []).map((p) => ({ value: p.id, label: p.name }))} showSearch optionFilterProp="label" />
          <Select allowClear placeholder="Task" style={{ width: 180 }} value={taskId} onChange={(v) => { setTaskId(v); setRunId(undefined); }}
            options={(tasks ?? []).map((t) => ({ value: t.id, label: t.title }))} showSearch optionFilterProp="label" />
          <Select allowClear placeholder="Run" style={{ width: 180 }} value={runId} onChange={setRunId}
            options={(runs ?? []).map((r) => ({ value: r.id, label: r.id.slice(0, 16) }))} showSearch />
          <Select allowClear placeholder="Vehicle" style={{ width: 180 }} value={vin} onChange={setVin}
            options={(vehicles ?? []).map((v) => ({ value: v.vin, label: v.vin }))} showSearch optionFilterProp="label" />
          <RangePicker showTime value={timeRange} onChange={(v) => setTimeRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)} />
          <Button type="primary" onClick={handleSearch} loading={isLoading}>Search</Button>
        </Space>
      </Card>

      <Card size="small" className="glass-card" bodyStyle={{ padding: 0, height: 'calc(100vh - 280px)', minHeight: 500 }}>
        {!queryParams
          ? <Empty description="Set filters and click Search" style={{ paddingTop: 100 }} />
          : isLoading
            ? <div style={{ textAlign: 'center', paddingTop: 100 }}><Spin size="large" /></div>
            : points.length === 0
              ? <Empty description="No trajectory points found" style={{ paddingTop: 100 }} />
              : <MapContainer center={center} zoom={13} style={{ width: '100%', height: '100%' }}>
                  <TrajectoryPolyline points={points} />
                </MapContainer>
        }
      </Card>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Object.entries(DRIVING_MODE_COLORS).map(([mode, color]) => (
          <Tag key={mode} color={color}>{mode}</Tag>
        ))}
        {trajectory && <Tag>Total: {trajectory.total} points</Tag>}
      </div>
    </div>
  );
}
