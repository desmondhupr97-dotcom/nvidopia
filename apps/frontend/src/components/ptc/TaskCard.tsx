import { Card } from 'antd';
import type { PtcTaskSummary } from '../../api/client';

interface TaskCardProps {
  task: PtcTaskSummary;
  onTaskClick: (taskId: string) => void;
}

export default function TaskCard({ task, onTaskClick }: TaskCardProps) {
  const start = task.start_date ?? null;
  const end = task.end_date ?? null;
  const hasRange = start || end;

  return (
    <Card
      className="ptc-task-card"
      title={task.name}
      onClick={() => onTaskClick(task.task_id)}
    >
      {hasRange && (
        <div className="ptc-task-card-timeline">
          <div className="ptc-task-card-timeline-bar" style={{ width: '50%' }} />
        </div>
      )}
      <div className="ptc-task-card-stats">
        <div className="stat-item">
          <div className="stat-value">{task.build_count}</div>
          <div>Builds</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{task.car_count}</div>
          <div>Cars</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{task.tag_count}</div>
          <div>Tags</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{task.total_mileage}</div>
          <div>km</div>
        </div>
      </div>
      <div className="ptc-task-card-footer">
        <span>{task.binding_status ?? '—'}</span>
        <span>{task.updated_at ? new Date(task.updated_at).toLocaleDateString() : ''}</span>
      </div>
    </Card>
  );
}
