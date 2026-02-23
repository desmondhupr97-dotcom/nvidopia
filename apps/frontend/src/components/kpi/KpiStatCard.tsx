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
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Spin />
        </div>
      ) : (
        <Statistic
          title={
            <span className="font-display" style={{ fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {title}
            </span>
          }
          value={value ?? undefined}
          precision={2}
          suffix={
            unit ? (
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{unit}</span>
            ) : undefined
          }
          valueStyle={{
            fontFamily: "'Orbitron', monospace",
            fontWeight: 700,
            color: '#00f0ff',
            textShadow: '0 0 10px rgba(0,240,255,0.3)',
          }}
          formatter={(val) => (val == null ? '\u2014' : String(val))}
        />
      )}
    </Card>
  );
}
