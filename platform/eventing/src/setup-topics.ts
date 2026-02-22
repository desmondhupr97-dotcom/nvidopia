import { Kafka } from 'kafkajs';
import { TOPICS, DLQ_SUFFIX } from './topics.js';

const MILLISECONDS_PER_DAY = 86_400_000;

interface TopicConfig {
  topic: string;
  numPartitions: number;
  configEntries: { name: string; value: string }[];
}

const coreTopicConfigs: TopicConfig[] = [
  {
    topic: TOPICS.TELEMETRY_MILEAGE,
    numPartitions: 6,
    configEntries: [
      { name: 'retention.ms', value: String(7 * MILLISECONDS_PER_DAY) },
    ],
  },
  {
    topic: TOPICS.VEHICLE_STATUS,
    numPartitions: 6,
    configEntries: [{ name: 'cleanup.policy', value: 'compact' }],
  },
  {
    topic: TOPICS.ISSUE_REPORTS,
    numPartitions: 3,
    configEntries: [
      { name: 'retention.ms', value: String(30 * MILLISECONDS_PER_DAY) },
    ],
  },
  {
    topic: TOPICS.KPI_METRICS,
    numPartitions: 3,
    configEntries: [
      { name: 'retention.ms', value: String(7 * MILLISECONDS_PER_DAY) },
    ],
  },
];

function buildDlqConfig(coreTopic: string): TopicConfig {
  return {
    topic: coreTopic + DLQ_SUFFIX,
    numPartitions: 1,
    configEntries: [
      { name: 'retention.ms', value: String(30 * MILLISECONDS_PER_DAY) },
    ],
  };
}

async function main() {
  const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
    .split(',')
    .map((b) => b.trim());

  const kafka = new Kafka({ clientId: 'nvidopia-topic-setup', brokers });
  const admin = kafka.admin();

  console.log('Connecting to Kafka admin...');
  await admin.connect();

  const allTopics: TopicConfig[] = [
    ...coreTopicConfigs,
    ...coreTopicConfigs.map((c) => buildDlqConfig(c.topic)),
  ];

  console.log(`Creating ${allTopics.length} topics...`);

  await admin.createTopics({
    topics: allTopics.map(({ topic, numPartitions, configEntries }) => ({
      topic,
      numPartitions,
      replicationFactor: 1,
      configEntries,
    })),
  });

  for (const t of allTopics) {
    console.log(`  ✓ ${t.topic} (${t.numPartitions} partitions)`);
  }

  await admin.disconnect();
  console.log('Topic setup complete.');
}

main().catch((err) => {
  console.error('Topic setup failed:', err);
  process.exit(1);
});
