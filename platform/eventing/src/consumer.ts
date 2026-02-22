import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { KafkaProducerService } from './producer.js';
import { DLQ_SUFFIX } from './topics.js';

export interface ConsumerOptions {
  maxRetries?: number;
  dlqEnabled?: boolean;
}

type MessageHandler = (message: {
  topic: string;
  partition: number;
  key: string | null;
  value: unknown;
  headers: Record<string, string | undefined>;
  timestamp: string;
}) => Promise<void>;

export class KafkaConsumerService {
  private consumer: Consumer;
  private dlqProducer: KafkaProducerService;
  private connected = false;
  private maxRetries: number;
  private dlqEnabled: boolean;
  private handlers = new Map<string, MessageHandler>();

  constructor(kafka: Kafka, groupId: string, options: ConsumerOptions = {}) {
    this.consumer = kafka.consumer({ groupId });
    this.dlqProducer = new KafkaProducerService(kafka);
    this.maxRetries = options.maxRetries ?? 3;
    this.dlqEnabled = options.dlqEnabled ?? true;
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await this.consumer.connect();
    if (this.dlqEnabled) {
      await this.dlqProducer.connect();
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    await this.consumer.disconnect();
    if (this.dlqEnabled) {
      await this.dlqProducer.disconnect();
    }
    this.connected = false;
  }

  async subscribe(topic: string, handler: MessageHandler): Promise<void> {
    this.handlers.set(topic, handler);
    await this.consumer.subscribe({ topic, fromBeginning: false });
    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this._processMessage(payload);
      },
    });
  }

  private async _processMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const handler = this.handlers.get(topic);
    if (!handler) return;

    const parsed = {
      topic,
      partition,
      key: message.key?.toString() ?? null,
      value: message.value ? JSON.parse(message.value.toString()) : null,
      headers: Object.fromEntries(
        Object.entries(message.headers ?? {}).map(([k, v]) => [
          k,
          v?.toString(),
        ]),
      ),
      timestamp: message.timestamp,
    };

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await handler(parsed);
        return;
      } catch (err) {
        console.error(
          `[KafkaConsumer] Retry ${attempt}/${this.maxRetries} failed for topic="${topic}" partition=${partition} offset=${message.offset}:`,
          err,
        );

        if (attempt === this.maxRetries) {
          console.error(
            `[KafkaConsumer] Max retries exhausted for topic="${topic}" offset=${message.offset}. ${this.dlqEnabled ? 'Sending to DLQ.' : 'Dropping message.'}`,
          );

          if (this.dlqEnabled) {
            const dlqTopic = topic + DLQ_SUFFIX;
            await this.dlqProducer.send(dlqTopic, parsed.key ?? 'unknown', {
              originalTopic: topic,
              partition,
              offset: message.offset,
              value: parsed.value,
              error: err instanceof Error ? err.message : String(err),
              failedAt: new Date().toISOString(),
            });
          }
        }
      }
    }
  }
}
