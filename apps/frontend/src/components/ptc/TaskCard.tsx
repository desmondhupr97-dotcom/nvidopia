import { Card } from 'antd';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import type { PtcTaskSummary } from '../../api/client';

interface TaskCardProps {
  task: PtcTaskSummary;
  onTaskClick: (taskId: string) => void;
}

export default function TaskCard({ task, onTaskClick }: TaskCardProps) {
  const start = task.start_date ?? null;
  const end = task.end_date ?? null;
  const hasRange = start || end;
  const isDraft = task.binding_status !== 'Published';

  const chartData = (task.daily_mileage ?? []).map((d) => ({
    date: d.date,
    km: d.km,
  }));

  return (
    <Card
      className={`ptc-task-card${isDraft ? ' draft' : ''}`}
      title={task.name}
      onClick={() => onTaskClick(task.task_id)}
    >
      {hasRange && (
        <>
          <div className="ptc-task-card-timeline">
            <div className="ptc-task-card-timeline-bar" style={{ width: '50%' }} />
          </div>
          <div className="ptc-task-card-dates">
            <span>{start ? new Date(start).toLocaleDateString() : '—'}</span>
            <span>{end ? new Date(end).toLocaleDateString() : '—'}</span>
          </div>
        </>
      )}
      {chartData.length > 0 && (
        <div className="ptc-task-card-chart">
          <ResponsiveContainer width="100%" height={60}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`grad-${task.task_id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#76B900" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#76B900" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="km"
                stroke="#76B900"
                strokeWidth={1.5}
                fill={`url(#grad-${task.task_id})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
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
