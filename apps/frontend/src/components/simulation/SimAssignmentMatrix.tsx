import { Checkbox, Table, Button, Space, Tag } from 'antd';
import type { SimVehicle, VehicleAssignment, Project, Task } from '../../api/client';

interface Props {
  vehicles: SimVehicle[];
  projects: Project[];
  tasks: Task[];
  assignments: VehicleAssignment[];
  onChange: (assignments: VehicleAssignment[]) => void;
}

export default function SimAssignmentMatrix({ vehicles, projects, tasks, assignments, onChange }: Props) {
  const isAssigned = (vin: string, taskId: string) =>
    assignments.some((a) => a.vin === vin && a.task_id === taskId);

  const toggle = (vin: string, taskId: string, projectId: string) => {
    if (isAssigned(vin, taskId)) {
      onChange(assignments.filter((a) => !(a.vin === vin && a.task_id === taskId)));
    } else {
      onChange([...assignments, { vin, project_id: projectId, task_id: taskId }]);
    }
  };

  const assignAllToFirst = () => {
    if (tasks.length === 0) return;
    const first = tasks[0]!;
    const project = projects.find((p) => p.id === first.projectId);
    if (!project) return;
    onChange(vehicles.map((v) => ({ vin: v.vin, project_id: project.id, task_id: first.id })));
  };

  const roundRobin = () => {
    const result: VehicleAssignment[] = [];
    vehicles.forEach((v, idx) => {
      const task = tasks[idx % tasks.length]!;
      const project = projects.find((p) => p.id === task.projectId);
      if (project) result.push({ vin: v.vin, project_id: project.id, task_id: task.id });
    });
    onChange(result);
  };

  const columns = [
    {
      title: 'Vehicle',
      dataIndex: 'vin',
      key: 'vin',
      fixed: 'left' as const,
      width: 180,
      render: (vin: string) => <code style={{ fontSize: 11 }}>{vin}</code>,
    },
    ...tasks.map((task) => {
      const project = projects.find((p) => p.id === task.projectId);
      return {
        title: (
          <div style={{ textAlign: 'center' as const, fontSize: 11 }}>
            <div><Tag color="blue" style={{ fontSize: 10 }}>{project?.name ?? task.projectId}</Tag></div>
            <div>{task.title}</div>
          </div>
        ),
        key: task.id,
        width: 140,
        render: (_: unknown, vehicle: SimVehicle) => (
          <div style={{ textAlign: 'center' }}>
            <Checkbox
              checked={isAssigned(vehicle.vin, task.id)}
              onChange={() => toggle(vehicle.vin, task.id, task.projectId)}
            />
          </div>
        ),
      };
    }),
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{assignments.length} assignment(s)</span>
        <Space size="small">
          <Button size="small" onClick={assignAllToFirst}>All → First Task</Button>
          <Button size="small" onClick={roundRobin}>Round Robin</Button>
        </Space>
      </div>
      <Table
        size="small"
        dataSource={vehicles}
        columns={columns}
        rowKey="vin"
        pagination={false}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
}
