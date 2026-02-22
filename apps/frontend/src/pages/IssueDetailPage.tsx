import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, MapPin, ExternalLink, Clock } from 'lucide-react';
import clsx from 'clsx';
import { getIssue, transitionIssue, triageIssue, getIssueTransitions } from '../api/client';

type IssueStatus = 'New' | 'Triage' | 'Assigned' | 'InProgress' | 'Fixed' | 'RegressionTracking' | 'Closed' | 'Reopened' | 'Rejected';

const VALID_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  New: ['Triage', 'Rejected'],
  Triage: ['Assigned', 'Rejected'],
  Assigned: ['InProgress'],
  InProgress: ['Fixed'],
  Fixed: ['RegressionTracking'],
  RegressionTracking: ['Closed', 'Reopened'],
  Reopened: ['InProgress'],
  Closed: [],
  Rejected: [],
};

const STATUS_COLORS: Record<IssueStatus, string> = {
  New: 'bg-sky-100 text-sky-800',
  Triage: 'bg-amber-100 text-amber-800',
  Assigned: 'bg-indigo-100 text-indigo-800',
  InProgress: 'bg-violet-100 text-violet-800',
  Fixed: 'bg-emerald-100 text-emerald-800',
  RegressionTracking: 'bg-purple-100 text-purple-800',
  Closed: 'bg-gray-100 text-gray-600',
  Reopened: 'bg-orange-100 text-orange-800',
  Rejected: 'bg-gray-100 text-gray-500',
};

const SEVERITY_COLORS: Record<string, string> = {
  Trivial: 'bg-emerald-100 text-emerald-800',
  Minor: 'bg-yellow-100 text-yellow-800',
  Major: 'bg-orange-100 text-orange-800',
  Critical: 'bg-red-100 text-red-800',
};

const TRANSITION_BUTTON_COLORS: Record<string, string> = {
  Triage: 'bg-amber-600 hover:bg-amber-700 text-white',
  Assigned: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  InProgress: 'bg-violet-600 hover:bg-violet-700 text-white',
  Fixed: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  RegressionTracking: 'bg-purple-600 hover:bg-purple-700 text-white',
  Closed: 'bg-gray-700 hover:bg-gray-800 text-white',
  Reopened: 'bg-orange-600 hover:bg-orange-700 text-white',
  Rejected: 'bg-red-600 hover:bg-red-700 text-white',
};

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [triageForm, setTriageForm] = useState({ assignee: '', module: '' });
  const [showTriageForm, setShowTriageForm] = useState(false);
  const [transitionReason, setTransitionReason] = useState('');

  const { data: issue, isLoading, error } = useQuery({
    queryKey: ['issue', id],
    queryFn: () => getIssue(id!),
    enabled: !!id,
  });

  const { data: transitions } = useQuery({
    queryKey: ['issue-transitions', id],
    queryFn: () => getIssueTransitions(id!),
    enabled: !!id,
  });

  const transitionMutation = useMutation({
    mutationFn: ({ toStatus, reason }: { toStatus: IssueStatus; reason?: string }) =>
      transitionIssue(id!, { to_status: toStatus, triggered_by: 'ui-user', reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
      queryClient.invalidateQueries({ queryKey: ['issue-transitions', id] });
      setTransitionReason('');
    },
  });

  const triageMutation = useMutation({
    mutationFn: () => triageIssue(id!, triageForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
      queryClient.invalidateQueries({ queryKey: ['issue-transitions', id] });
      setShowTriageForm(false);
      setTriageForm({ assignee: '', module: '' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Failed to load issue.
      </div>
    );
  }

  const currentStatus = issue.status as IssueStatus;
  const allowedNext = VALID_TRANSITIONS[currentStatus] ?? [];
  const isTriage = currentStatus === 'Triage';

  return (
    <div className="space-y-6">
      <Link to="/issues" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Issues
      </Link>

      {/* Issue details card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-indigo-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Issue {(issue.id as string).slice(0, 12)}</h1>
              <p className="mt-0.5 text-sm font-mono text-gray-400">{issue.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={clsx('rounded-full px-3 py-1 text-sm font-semibold', SEVERITY_COLORS[issue.severity] ?? 'bg-gray-100 text-gray-700')}>
              {issue.severity}
            </span>
            <span className={clsx('rounded-full px-3 py-1 text-sm font-semibold', STATUS_COLORS[currentStatus] ?? 'bg-gray-100 text-gray-700')}>
              {currentStatus}
            </span>
          </div>
        </div>

        {issue.description && (
          <p className="mt-4 text-sm text-gray-600">{issue.description}</p>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">Category</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{issue.category}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">Takeover Type</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{issue.takeover_type ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">Assignee</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{issue.assignee ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">Module</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{issue.module ?? '—'}</dd>
          </div>
          {(issue.gps_lat != null && issue.gps_lng != null) && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> GPS</span>
              </dt>
              <dd className="mt-1 text-sm font-mono text-gray-900">
                {Number(issue.gps_lat).toFixed(6)}, {Number(issue.gps_lng).toFixed(6)}
              </dd>
            </div>
          )}
          {issue.data_snapshot_uri && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">Data Snapshot</dt>
              <dd className="mt-1 text-sm">
                <a href={issue.data_snapshot_uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">Run</dt>
            <dd className="mt-1 text-sm font-mono text-gray-900">{issue.run_id ? (issue.run_id as string).slice(0, 8) : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">Triggered At</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {issue.trigger_timestamp ? new Date(issue.trigger_timestamp).toLocaleString() : '—'}
            </dd>
          </div>
        </dl>

        {issue.fault_codes && issue.fault_codes.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400">Fault Codes</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {issue.fault_codes.map((code: string) => (
                <span key={code} className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-mono text-red-700">{code}</span>
              ))}
            </div>
          </div>
        )}

        {issue.environment_tags && issue.environment_tags.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400">Environment Tags</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {issue.environment_tags.map((tag: string) => (
                <span key={tag} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Reserved triage fields */}
        {(issue.triage_mode || issue.triage_hint) && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-amber-700">Triage Hints</h3>
            <dl className="mt-2 grid grid-cols-2 gap-3">
              {issue.triage_mode && (
                <div>
                  <dt className="text-xs text-amber-600">Mode</dt>
                  <dd className="text-sm font-medium text-amber-900">{issue.triage_mode}</dd>
                </div>
              )}
              {issue.triage_hint && (
                <div>
                  <dt className="text-xs text-amber-600">Hint</dt>
                  <dd className="text-sm font-medium text-amber-900">{issue.triage_hint}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      {/* Transition panel */}
      {allowedNext.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Transition</h2>
          <p className="mt-1 text-sm text-gray-500">
            Current status: <strong>{currentStatus}</strong>. Choose the next state:
          </p>

          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">Reason (optional)</label>
            <input
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              placeholder="Justification for transition..."
              className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {allowedNext.map((nextStatus) => {
              if (isTriage && nextStatus === 'Assigned') {
                return (
                  <button
                    key={nextStatus}
                    onClick={() => setShowTriageForm(true)}
                    className={clsx('rounded-lg px-4 py-2 text-sm font-medium transition-colors', TRANSITION_BUTTON_COLORS[nextStatus] ?? 'bg-gray-600 hover:bg-gray-700 text-white')}
                  >
                    Assign (Triage)
                  </button>
                );
              }
              return (
                <button
                  key={nextStatus}
                  onClick={() => transitionMutation.mutate({ toStatus: nextStatus, reason: transitionReason || undefined })}
                  disabled={transitionMutation.isPending}
                  className={clsx('rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50', TRANSITION_BUTTON_COLORS[nextStatus] ?? 'bg-gray-600 hover:bg-gray-700 text-white')}
                >
                  {nextStatus}
                </button>
              );
            })}
          </div>

          {transitionMutation.isError && (
            <p className="mt-3 text-sm text-red-600">Transition failed. The target state may not be valid.</p>
          )}

          {showTriageForm && (
            <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <h3 className="text-sm font-semibold text-indigo-900">Triage Assignment</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Assign To *</label>
                  <input
                    required
                    value={triageForm.assignee}
                    onChange={(e) => setTriageForm({ ...triageForm, assignee: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Module *</label>
                  <input
                    required
                    value={triageForm.module}
                    onChange={(e) => setTriageForm({ ...triageForm, module: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => triageMutation.mutate()}
                  disabled={triageMutation.isPending || !triageForm.assignee || !triageForm.module}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {triageMutation.isPending ? 'Assigning...' : 'Assign & Transition'}
                </button>
                <button
                  onClick={() => setShowTriageForm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit trail */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Audit Trail</h2>
        {transitions && transitions.items && transitions.items.length > 0 ? (
          <div className="mt-4 space-y-0">
            {transitions.items.map((t: Record<string, unknown>, idx: number) => (
              <div key={t.id as string} className="relative flex gap-4 pb-6">
                {idx < transitions.items.length - 1 && (
                  <div className="absolute left-[11px] top-6 h-full w-0.5 bg-gray-200" />
                )}
                <div className="relative z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100">
                  <Clock className="h-3 w-3 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={clsx('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[t.from_status as IssueStatus] ?? 'bg-gray-100 text-gray-700')}>
                      {t.from_status as string}
                    </span>
                    <span className="text-xs text-gray-400">&rarr;</span>
                    <span className={clsx('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[t.to_status as IssueStatus] ?? 'bg-gray-100 text-gray-700')}>
                      {t.to_status as string}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    by <span className="font-medium text-gray-700">{t.triggered_by as string}</span>
                    {' at '}
                    {t.transitioned_at ? new Date(t.transitioned_at as string).toLocaleString() : '—'}
                  </p>
                  {Boolean(t.reason) && (
                    <p className="mt-0.5 text-xs text-gray-500 italic">"{String(t.reason)}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-400">No transitions recorded yet.</p>
        )}
      </div>
    </div>
  );
}
