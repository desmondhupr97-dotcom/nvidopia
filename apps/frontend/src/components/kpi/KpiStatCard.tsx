import { Card, Statistic, Spin } from 'antd';

interface Props {
  title: string;
  value: number | null;
  unit?: string;
  loading?: boolean;
}

export default function KpiStatCard({ title, value, unit, loading }: Props) {
  return (
    <Card className="glass-panel hud-corners glow-accent-hover" style={{ height: '100%' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin />
        </div>
      ) : (
        <Statistic
          title={
            <span className="font-display" style={{ fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
            color: '#00FF41',
            textShadow: '0 0 8px rgba(0,255,65,0.25)',
          }}
          formatter={(val) => (val == null ? '\u2014' : String(val))}
        />
      )}
    </Card>
  );
}
