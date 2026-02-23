import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Tabs, Input, Button, Timeline, Progress, Tag, Space, Empty } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { GitBranch } from 'lucide-react';
import { traceForward, traceBackward, getCoverage } from '../api/client';
import { FullPageSpinner } from '../components/shared';

type Tab = 'forward' | 'backward';

const NODE_TYPE_COLORS: Record<string, string> = {
  requirement: '#3b82f6',
  commit: '#64748b',
  build: '#f59e0b',
  project: '#6366f1',
  task: '#8b5cf6',
  run: '#22c55e',
  issue: '#ef4444',
};

const NODE_TYPE_LABELS: Record<string, string> = {
  requirement: 'REQ',
  commit: 'CMT',
  build: 'BLD',
  project: 'PRJ',
  task: 'TSK',
  run: 'RUN',
  issue: 'ISS',
};

export default function TraceabilityPage() {
  const [tab, setTab] = useState<Tab>('forward');
  const [inputId, setInputId] = useState('');
  const [traceId, setTraceId] = useState('');

  const { data: forwardData, isLoading: fwdLoading } = useQuery({
    queryKey: ['trace-forward', traceId],
    queryFn: () => traceForward(traceId),
    enabled: tab === 'forward' && !!traceId,
  });

  const { data: backwardData, isLoading: bwdLoading } = useQuery({
    queryKey: ['trace-backward', traceId],
    queryFn: () => traceBackward(traceId),
    enabled: tab === 'backward' && !!traceId,
  });

  const { data: coverage } = useQuery({
    queryKey: ['trace-coverage'],
    queryFn: () => getCoverage({}),
  });

  const handleTrace = () => {
    setTraceId(inputId.trim());
  };

  const traceData = tab === 'forward' ? forwardData : backwardData;
  const isLoading = tab === 'forward' ? fwdLoading : bwdLoading;
  const traceLinks = traceData?.links ?? [];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <GitBranch size={28} style={{ color: '#6366f1' }} />
        <h1 className="page-title">Traceability</h1>
      </div>
      <p className="page-subtitle" style={{ marginBottom: 24 }}>
        End-to-end links between requirements, tasks, runs, and issues for coverage and impact analysis.
      </p>

      {/* Coverage card */}
      {coverage && (
        <Card className="glass-panel" style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Requirement Verification Coverage
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700, color: '#00FF41', textShadow: '0 0 8px rgba(0,255,65,0.25)' }}>
              {coverage.percentage != null ? `${Number(coverage.percentage).toFixed(1)}%` : '—'}
            </span>
            <div style={{ flex: 1 }}>
              <Progress
                percent={Number(coverage.percentage ?? 0)}
                showInfo={false}
                strokeColor={{ from: '#00FF41', to: '#00cc33' }}
              />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {coverage.covered ?? 0} / {coverage.total ?? 0} verified
            </span>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs
        activeKey={tab}
        onChange={(k) => { setTab(k as Tab); setTraceId(''); setInputId(''); }}
        items={[
          { key: 'forward', label: 'Forward Trace' },
          { key: 'backward', label: 'Backward Trace' },
        ]}
        style={{ marginBottom: 16 }}
      />

      {/* Search */}
      <Space.Compact style={{ width: '100%', maxWidth: 500, marginBottom: 24 }}>
        <Input
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
          placeholder={tab === 'forward' ? 'Enter Requirement ID...' : 'Enter Issue ID...'}
          onPressEnter={handleTrace}
          size="large"
        />
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleTrace}
          disabled={!inputId.trim()}
          size="large"
        >
          Trace
        </Button>
      </Space.Compact>

      {/* Loading */}
      {isLoading && <FullPageSpinner />}

      {/* Results */}
      {traceData && traceData.nodes && traceData.nodes.length > 0 && (
        <Card
          className="glass-panel"
          title={
            <span className="font-display" style={{ fontWeight: 600 }}>
              {tab === 'forward' ? 'Forward' : 'Backward'} Trace from{' '}
              <code style={{ color: '#818cf8' }}>{traceData.origin_id}</code>
            </span>
          }
        >
          <Timeline
            items={traceData.nodes.map((node: Record<string, unknown>, idx: number) => {
              const nodeType = node.type as string;
              const link = idx < traceLinks.length ? traceLinks[idx] as Record<string, unknown> : null;
              return {
                dot: (
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: NODE_TYPE_COLORS[nodeType] ?? '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#fff',
                    fontFamily: "var(--font-mono)",
                    boxShadow: `0 0 12px ${NODE_TYPE_COLORS[nodeType] ?? '#64748b'}40`,
                  }}>
                    {NODE_TYPE_LABELS[nodeType] ?? '?'}
                  </div>
                ),
                children: (
                  <div style={{ paddingBottom: 8 }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {(node.label as string) || (node.id as string)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {nodeType} &middot; <code>{node.id as string}</code>
                    </div>
                    {link && (
                      <Tag style={{ marginTop: 4, fontSize: 11, fontStyle: 'italic' }}>
                        {link.relationship as string}
                      </Tag>
                    )}
                  </div>
                ),
              };
            })}
          />
        </Card>
      )}

      {traceId && !isLoading && traceData && (!traceData.nodes || traceData.nodes.length === 0) && (
        <Card className="glass-panel">
          <Empty description={`No trace results found for "${traceId}"`} />
        </Card>
      )}
    </div>
  );
}
