import { MonitorPlay } from 'lucide-react';
import { ComingSoonPage } from '../components/shared';

export default function SimulationPlaceholderPage() {
  return (
    <ComingSoonPage
      icon={MonitorPlay}
      iconColor="#22c55e"
      title="Simulation Testing"
      description="Integration with simulation environments for virtual validation of autonomous driving algorithms."
      features={[
        'Scenario-based simulation',
        'Hardware-in-the-loop testing',
        'Virtual regression testing',
        'Simulation result correlation with road test data',
      ]}
    />
  );
}
