import { Card, Statistic, Spin } from 'antd';

interface Props {
  title: string;
  value: number | null;
  unit?: string;
  loading?: boolean;
}

export default function KpiStatCard({ title, value, unit, loading }: Props) {
  return (
    <Card className="glass-panel" style={{ height: '100%' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin />
        </div>
      ) : (
        <Statistic
          title={
            <span className="font-display" style={{ fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {title}
            </span>
          }
          value={value ?? undefined}
          precision={2}
          suffix={
            unit ? (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{unit}</span>
            ) : undefined
          }
          valueStyle={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            color: 'var(--accent-strong)',
          }}
          formatter={(val) => (val == null ? '\u2014' : String(val))}
        />
      )}
    </Card>
  );
}
