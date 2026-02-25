import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Tabs, Input, Button, Progress, Tag, Space, Empty, Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { GitBranch } from 'lucide-react';
import { traceForward, traceBackward, getCoverage } from '../api/client';
import { FullPageSpinner } from '../components/shared';

type Tab = 'forward' | 'backward';

const NODE_TYPE_COLORS: Record<string, string> = {
  requirement: '#007AFF',
  commit: '#AF52DE',
  build: '#FF9500',
  project: '#76B900',
  task: '#FFCC00',
  run: '#34C759',
  issue: '#FF3B30',
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

function CoverageRing({ percentage, covered, total }: {
  percentage: number | null;
  covered: number;
  total: number;
}) {
  const pct = percentage != null ? Number(percentage) : 0;
  const size = 120;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 80 ? '#34C759' : pct >= 50 ? '#FF9500' : '#FF3B30';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="var(--border-secondary)" strokeWidth={stroke}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
            {percentage != null ? `${pct.toFixed(0)}` : '—'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>%</span>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          Requirement Verification
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          {covered} of {total} requirements verified
        </div>
        <Progress
          percent={pct}
          showInfo={false}
          strokeColor={color}
          size="small"
          style={{ maxWidth: 280 }}
        />
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34C759' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Covered ({covered})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border-primary)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Remaining ({total - covered})</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TraceChain({ nodes, links }: {
  nodes: Record<string, unknown>[];
  links: Record<string, unknown>[];
}) {
  return (
    <div style={{ overflowX: 'auto', padding: '16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content' }}>
        {nodes.map((node, idx) => {
          const nodeType = node.type as string;
          const color = NODE_TYPE_COLORS[nodeType] ?? '#6E6E73';
          const label = NODE_TYPE_LABELS[nodeType] ?? '?';
          const link = idx < links.length ? links[idx] as Record<string, unknown> : null;

          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start' }}>
              {/* Node */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 100, maxWidth: 140 }}>
                <Tooltip title={`${nodeType}: ${node.id as string}`}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: nodeType === 'task' ? '#1D1D1F' : '#fff',
                    fontFamily: 'var(--font-mono)',
                    boxShadow: `0 2px 8px ${color}40`,
                    cursor: 'default',
                    flexShrink: 0,
                  }}>
                    {label}
                  </div>
                </Tooltip>

                <Tag
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    fontWeight: 500,
                    borderColor: `${color}30`,
                    color: nodeType === 'task' ? '#8B7500' : color,
                    background: `${color}10`,
                    borderRadius: 'var(--radius-full)',
                    maxWidth: 130,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {nodeType}
                </Tag>

                <div style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  maxWidth: 130,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                }}>
                  {(node.label as string) || (node.id as string)}
                </div>
              </div>

              {/* Connector line */}
              {idx < nodes.length - 1 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  alignSelf: 'flex-start', paddingTop: 18, minWidth: 60,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', width: '100%',
                  }}>
                    <div style={{ flex: 1, height: 2, background: 'var(--border-primary)' }} />
                    <div style={{
                      width: 0, height: 0,
                      borderTop: '5px solid transparent',
                      borderBottom: '5px solid transparent',
                      borderLeft: '6px solid var(--border-primary)',
                    }} />
                  </div>
                  {link && (
                    <span style={{
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      marginTop: 4,
                      fontStyle: 'italic',
                      whiteSpace: 'nowrap',
                    }}>
                      {link.relationship as string}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(118, 185, 0, 0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <GitBranch size={20} style={{ color: '#76B900' }} />
        </div>
        <h1 className="page-title">Traceability</h1>
      </div>
      <p className="page-subtitle" style={{ marginBottom: 24 }}>
        End-to-end links between requirements, tasks, runs, and issues for coverage and impact analysis.
      </p>

      {/* Coverage summary */}
      {coverage && (
        <Card className="ios-card-elevated" style={{ marginBottom: 24, border: 'none' }}>
          <CoverageRing
            percentage={coverage.percentage != null ? Number(coverage.percentage) : null}
            covered={Number(coverage.covered ?? 0)}
            total={Number(coverage.total ?? 0)}
          />
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
          style={{ background: '#76B900', borderColor: '#76B900' }}
        >
          Trace
        </Button>
      </Space.Compact>

      {/* Loading */}
      {isLoading && <FullPageSpinner />}

      {/* Results */}
      {traceData && traceData.nodes && traceData.nodes.length > 0 && (
        <Card
          className="ios-card"
          title={
            <span className="font-display" style={{ fontWeight: 600 }}>
              {tab === 'forward' ? 'Forward' : 'Backward'} Trace from{' '}
              <code style={{ color: '#76B900', background: 'rgba(118,185,0,0.08)', padding: '2px 8px', borderRadius: 6, fontSize: 13 }}>
                {traceData.origin_id}
              </code>
            </span>
          }
          extra={
            <Tag style={{ borderRadius: 'var(--radius-full)', fontWeight: 500 }}>
              {traceData.nodes.length} nodes
            </Tag>
          }
        >
          <TraceChain nodes={traceData.nodes as Record<string, unknown>[]} links={traceLinks as Record<string, unknown>[]} />
        </Card>
      )}

      {traceId && !isLoading && traceData && (!traceData.nodes || traceData.nodes.length === 0) && (
        <Card className="ios-card">
          <Empty description={`No trace results found for "${traceId}"`} />
        </Card>
      )}
    </div>
  );
}
