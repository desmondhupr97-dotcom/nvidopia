import { Kafka, Producer, RecordMetadata } from 'kafkajs';

export class KafkaProducerService {
  private producer: Producer;
  private connected = false;

  constructor(kafka: Kafka) {
    this.producer = kafka.producer({
      idempotent: true,
      maxInFlightRequests: 5,
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await this.producer.connect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    await this.producer.disconnect();
    this.connected = false;
  }

  async send(
    topic: string,
    key: string,
    value: unknown,
    headers?: Record<string, string>,
  ): Promise<RecordMetadata[]> {
    if (!this.connected) {
      throw new Error('Producer is not connected. Call connect() first.');
    }

    return this.producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(value),
          headers,
        },
      ],
    });
  }
}
