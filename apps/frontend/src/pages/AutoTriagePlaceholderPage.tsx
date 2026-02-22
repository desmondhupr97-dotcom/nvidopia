import { Brain } from 'lucide-react';
import { ComingSoonPage } from '../components/shared';

export default function AutoTriagePlaceholderPage() {
  return (
    <ComingSoonPage
      icon={Brain}
      iconColor="#818cf8"
      title="Auto-Triage"
      description="Intelligent automated issue classification and assignment powered by rule engine and ML models."
      featuresLabel="Planned Capabilities"
      features={[
        'Rule-based classification',
        'ML severity prediction',
        'Auto-assignment to team',
        'Historical pattern matching',
      ]}
    />
  );
}
