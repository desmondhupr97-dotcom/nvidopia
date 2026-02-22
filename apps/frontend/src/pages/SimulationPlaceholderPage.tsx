import { MonitorPlay, Square } from 'lucide-react';

const PLANNED_FEATURES = [
  'Scenario-based simulation',
  'Hardware-in-the-loop testing',
  'Virtual regression testing',
  'Simulation result correlation with road test data',
];

export default function SimulationPlaceholderPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
          <MonitorPlay className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Simulation Testing</h1>
        <p className="mt-1 text-lg font-medium text-emerald-600">Coming Soon</p>
        <p className="mt-4 text-sm leading-relaxed text-gray-500">
          Integration with simulation environments for virtual validation of autonomous driving
          algorithms before physical road testing.
        </p>
        <div className="mt-8 text-left">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Planned Features</h2>
          <ul className="space-y-3">
            {PLANNED_FEATURES.map((feat) => (
              <li key={feat} className="flex items-center gap-3">
                <Square className="h-4 w-4 flex-shrink-0 text-gray-300" />
                <span className="text-sm text-gray-600">{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
