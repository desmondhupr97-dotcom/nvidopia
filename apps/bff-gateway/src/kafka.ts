import { Kafka, Producer, logLevel } from 'kafkajs';

const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');

export const kafka = new Kafka({
  clientId: 'bff-gateway',
  brokers,
  logLevel: logLevel.WARN,
});

let producer: Producer | null = null;

export async function connectProducer(): Promise<Producer> {
  if (producer) return producer;
  producer = kafka.producer({ allowAutoTopicCreation: true });
  await producer.connect();
  console.log('[kafka] producer connected');
  return producer;
}

export async function disconnectProducer(): Promise<void> {
  if (!producer) return;
  await producer.disconnect();
  producer = null;
  console.log('[kafka] producer disconnected');
}

export function getProducer(): Producer {
  if (!producer) throw new Error('Kafka producer not connected – call connectProducer() first');
  return producer;
}
