import { Card, Statistic, Spin } from 'antd';

interface Props {
  title: string;
  value: number | null;
  unit?: string;
  loading?: boolean;
}

export default function KpiStatCard({ title, value, unit, loading }: Props) {
  return (
    <Card className="glass-panel glow-accent-hover" style={{ height: '100%' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Spin />
        </div>
      ) : (
        <Statistic
          title={
            <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 500 }}>
              {title}
            </span>
          }
          value={value ?? undefined}
          precision={2}
          suffix={
            unit ? (
              <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>{unit}</span>
            ) : undefined
          }
          valueStyle={{
            fontFamily: "'Orbitron', 'Exo 2', sans-serif",
            fontWeight: 700,
            color: '#e2e8f0',
          }}
          formatter={(val) => (val == null ? '\u2014' : String(val))}
        />
      )}
    </Card>
  );
}
