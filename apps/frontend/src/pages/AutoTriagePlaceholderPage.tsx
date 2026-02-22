import { Brain, Square } from 'lucide-react';

const PLANNED_CAPABILITIES = [
  'Rule-based classification',
  'ML severity prediction',
  'Auto-assignment to team',
  'Historical pattern matching',
];

export default function AutoTriagePlaceholderPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
          <Brain className="h-8 w-8 text-indigo-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Auto-Triage</h1>
        <p className="mt-1 text-lg font-medium text-indigo-600">Coming Soon</p>
        <p className="mt-4 text-sm leading-relaxed text-gray-500">
          Intelligent automated issue classification and assignment powered by rule engine
          and ML models. This feature is currently in the planning phase.
        </p>
        <div className="mt-8 text-left">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Planned Capabilities</h2>
          <ul className="space-y-3">
            {PLANNED_CAPABILITIES.map((cap) => (
              <li key={cap} className="flex items-center gap-3">
                <Square className="h-4 w-4 flex-shrink-0 text-gray-300" />
                <span className="text-sm text-gray-600">{cap}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
