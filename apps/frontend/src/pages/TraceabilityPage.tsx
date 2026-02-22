import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GitBranch, Search, ArrowDown } from 'lucide-react';
import clsx from 'clsx';
import { traceForward, traceBackward, getCoverage } from '../api/client';

type Tab = 'forward' | 'backward';

const NODE_TYPE_COLORS: Record<string, string> = {
  requirement: 'bg-blue-500',
  commit: 'bg-gray-600',
  build: 'bg-amber-500',
  project: 'bg-indigo-500',
  task: 'bg-violet-500',
  run: 'bg-emerald-500',
  issue: 'bg-red-500',
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

  const handleTrace = (e: React.FormEvent) => {
    e.preventDefault();
    setTraceId(inputId.trim());
  };

  const traceData = tab === 'forward' ? forwardData : backwardData;
  const isLoading = tab === 'forward' ? fwdLoading : bwdLoading;
  const traceLinks = traceData?.links ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GitBranch className="h-7 w-7 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Traceability</h1>
      </div>

      <p className="text-sm text-gray-500">
        Traceability shows end-to-end links between requirements, tasks, runs, and issues, helping you understand coverage and impact before release.
      </p>

      {/* Coverage card */}
      {coverage && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500">Requirement Verification Coverage</h2>
          <div className="mt-3 flex items-center gap-4">
            <span className="text-3xl font-bold text-indigo-600">
              {coverage.coverage_percent != null ? `${Number(coverage.coverage_percent).toFixed(1)}%` : '—'}
            </span>
            <div className="flex-1">
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${coverage.coverage_percent ?? 0}%` }}
                />
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {coverage.verified ?? 0} / {coverage.total_requirements ?? 0} verified
            </div>
          </div>
        </div>
      )}

      {/* Tab selector */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {(['forward', 'backward'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setTraceId(''); setInputId(''); }}
            className={clsx(
              'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {t === 'forward' ? 'Forward Trace' : 'Backward Trace'}
          </button>
        ))}
      </div>

      {/* Search form */}
      <form onSubmit={handleTrace} className="flex gap-2">
        <input
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
          placeholder={tab === 'forward' ? 'Enter Requirement ID...' : 'Enter Issue ID...'}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!inputId.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Search className="h-4 w-4" />
          Trace
        </button>
      </form>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      )}

      {/* Trace result timeline */}
      {traceData && traceData.nodes && traceData.nodes.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-medium text-gray-500">
            {tab === 'forward' ? 'Forward' : 'Backward'} Trace from{' '}
            <span className="font-mono text-gray-900">{traceData.origin_id}</span>
          </h2>
          <div className="space-y-0">
            {traceData.nodes.map((node: Record<string, unknown>, idx: number) => {
              const nodeType = node.type as string;
              const link = idx < traceLinks.length ? traceLinks[idx] as Record<string, unknown> : null;
              return (
                <div key={`${nodeType}-${node.id}`}>
                  <div className="flex items-center gap-3">
                    <div className={clsx('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', NODE_TYPE_COLORS[nodeType] ?? 'bg-gray-500')}>
                      {NODE_TYPE_LABELS[nodeType] ?? '?'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {(node.label as string) || (node.id as string)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {nodeType} &middot; <span className="font-mono">{node.id as string}</span>
                      </p>
                    </div>
                  </div>
                  {idx < traceData.nodes.length - 1 && (
                    <div className="ml-4 flex items-center gap-2 py-1.5">
                      <ArrowDown className="h-4 w-4 text-gray-300" />
                      {link && (
                        <span className="text-xs text-gray-400 italic">{link.relationship as string}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {traceId && !isLoading && traceData && (!traceData.nodes || traceData.nodes.length === 0) && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
          No trace results found for "{traceId}".
        </div>
      )}
    </div>
  );
}
