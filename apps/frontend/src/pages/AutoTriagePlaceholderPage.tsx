import { Card, Space, Tooltip } from 'antd';
import { Sparkles, CheckCircle2, Clock, BarChart3, Brain, Inbox } from 'lucide-react';

const PLANNED_FEATURES = [
  'Rule-based classification',
  'ML severity prediction',
  'Auto-assignment to team',
  'Historical pattern matching',
];

const MOCK_RESULT_FIELDS = [
  { label: 'Severity', value: 'P1 — Critical', color: '#FF3B30' },
  { label: 'Category', value: 'Perception > LiDAR', color: '#007AFF' },
  { label: 'Assigned Team', value: 'Sensor Fusion', color: '#AF52DE' },
  { label: 'Confidence', value: '92%', color: '#34C759' },
];

export default function AutoTriagePlaceholderPage() {
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(175, 82, 222, 0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={20} style={{ color: '#AF52DE' }} />
        </div>
        <h1 className="page-title">Auto-Triage</h1>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'rgba(175, 82, 222, 0.08)',
          color: '#AF52DE',
          fontSize: 11, fontWeight: 600,
          padding: '3px 10px',
          borderRadius: 'var(--radius-full)',
          letterSpacing: '0.02em',
        }}>
          Beta
        </span>
      </div>
      <p className="page-subtitle" style={{ marginBottom: 24 }}>
        Intelligent automated issue classification and assignment powered by rule engine and ML models.
      </p>

      {/* AI Analysis Panel */}
      <Card className="ios-card-elevated" style={{ marginBottom: 24, border: 'none' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Brain size={16} style={{ color: '#AF52DE' }} />
          AI Issue Analysis
        </div>

        <textarea
          placeholder="Describe an issue or paste error logs..."
          disabled
          style={{
            width: '100%',
            minHeight: 120,
            padding: 16,
            border: '1px solid var(--border-secondary)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-deep)',
            color: 'var(--text-muted)',
            fontSize: 14,
            fontFamily: 'var(--font-body)',
            resize: 'vertical',
            outline: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <Tooltip title="Feature in development">
            <button
              className="btn-primary-green"
              disabled
              style={{
                opacity: 0.5,
                cursor: 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Sparkles size={14} />
              Analyze
            </button>
          </Tooltip>
        </div>

        {/* Placeholder result preview */}
        <div style={{
          marginTop: 20,
          padding: 16,
          background: 'var(--bg-deep)',
          borderRadius: 'var(--radius-sm)',
          border: '1px dashed var(--border-primary)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Analysis Preview
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 12,
          }}>
            {MOCK_RESULT_FIELDS.map((field) => (
              <div key={field.label} style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-secondary)',
                borderRadius: 'var(--radius-xs)',
                padding: '12px 14px',
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  {field.label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: field.color }}>
                  {field.value}
                </div>
              </div>
            ))}
          </div>
          <div style={{
            textAlign: 'center', marginTop: 12,
            fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic',
          }}>
            Sample output — actual results will appear here once enabled
          </div>
        </div>
      </Card>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Recent Analyses */}
        <Card className="ios-card" style={{ border: 'none' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} style={{ color: '#FF9500' }} />
            Recent Analyses
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '32px 0',
            color: 'var(--text-muted)',
          }}>
            <Inbox size={36} style={{ color: 'var(--border-primary)', marginBottom: 12 }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>No analyses yet</span>
            <span style={{ fontSize: 12, marginTop: 4 }}>Past triage results will appear here</span>
          </div>
        </Card>

        {/* Triage Accuracy */}
        <Card className="ios-card" style={{ border: 'none' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={16} style={{ color: '#34C759' }} />
            Triage Accuracy
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '32px 0',
            color: 'var(--text-muted)',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'rgba(52, 199, 89, 0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 12,
            }}>
              <BarChart3 size={24} style={{ color: 'var(--border-primary)' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Coming Soon</span>
            <span style={{ fontSize: 12, marginTop: 4 }}>Accuracy metrics available after first analyses</span>
          </div>
        </Card>
      </div>

      {/* Planned features */}
      <Card className="ios-card" style={{ border: 'none' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
          Planned Capabilities
        </div>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {PLANNED_FEATURES.map((feat) => (
            <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircle2 size={16} style={{ color: 'var(--text-muted)', opacity: 0.4, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{feat}</span>
            </div>
          ))}
        </Space>
      </Card>
    </div>
  );
}
