import { Card, Space } from 'antd';
import { Brain, CheckCircle2 } from 'lucide-react';

const PLANNED_CAPABILITIES = [
  'Rule-based classification',
  'ML severity prediction',
  'Auto-assignment to team',
  'Historical pattern matching',
];

export default function AutoTriagePlaceholderPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Card
        className="glass-panel-elevated"
        style={{ maxWidth: 480, width: '100%', textAlign: 'center', padding: '20px 0' }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: 'rgba(99,102,241,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 0 24px rgba(99,102,241,0.2)',
          }}
        >
          <Brain size={36} style={{ color: '#818cf8' }} />
        </div>

        <h1 style={{ fontFamily: "'Orbitron', 'Exo 2', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Auto-Triage
        </h1>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#6366f1', marginTop: 4 }}>Coming Soon</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginTop: 16, padding: '0 12px' }}>
          Intelligent automated issue classification and assignment powered by rule engine and ML models.
        </p>

        <div style={{ textAlign: 'left', padding: '0 24px', marginTop: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
            Planned Capabilities
          </div>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {PLANNED_CAPABILITIES.map((cap) => (
              <div key={cap} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle2 size={16} style={{ color: 'var(--text-muted)', opacity: 0.4, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{cap}</span>
              </div>
            ))}
          </Space>
        </div>
      </Card>
    </div>
  );
}
