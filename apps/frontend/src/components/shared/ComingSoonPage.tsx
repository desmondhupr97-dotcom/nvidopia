import { Card, Space } from 'antd';
import { CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  description: string;
  features: string[];
  featuresLabel?: string;
}

export default function ComingSoonPage({ icon: Icon, iconColor, title, description, features, featuresLabel = 'Planned Features' }: Props) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Card
        className="glass-panel-elevated"
        style={{ maxWidth: 480, width: '100%', textAlign: 'center', padding: '20px 0' }}
      >
        <div
          style={{
            width: 72, height: 72, borderRadius: 20,
            background: `${iconColor}1f`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: `0 0 24px ${iconColor}33`,
          }}
        >
          <Icon size={36} style={{ color: iconColor }} />
        </div>

        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {title}
        </h1>
        <p style={{ fontSize: 16, fontWeight: 600, color: iconColor, marginTop: 4 }}>Coming Soon</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginTop: 16, padding: '0 12px' }}>
          {description}
        </p>

        <div style={{ textAlign: 'left', padding: '0 24px', marginTop: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
            {featuresLabel}
          </div>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {features.map((feat) => (
              <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle2 size={16} style={{ color: 'var(--text-muted)', opacity: 0.4, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{feat}</span>
              </div>
            ))}
          </Space>
        </div>
      </Card>
    </div>
  );
}
