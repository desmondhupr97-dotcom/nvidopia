import { Kafka, type Consumer, type EachMessagePayload } from 'kafkajs';
import crypto from 'node:crypto';
import { Issue } from '../models/index.js';
import { executeTransition } from '../state-machine.js';

const TOPIC = 'ad.testing.issue.reports';
const GROUP_ID = 'issue-workflow-reports';
const MAX_RETRIES = 3;

let consumer: Consumer | null = null;

export async function startIssueReportConsumer(brokers: string[]): Promise<void> {
  const kafka = new Kafka({
    clientId: 'issue-workflow',
    brokers,
    retry: { retries: MAX_RETRIES },
  });

  consumer = kafka.consumer({ groupId: GROUP_ID });

  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: false });

  await consumer.run({
    eachMessage: async (payload: EachMessagePayload) => {
      const { message, topic, partition } = payload;
      let attempt = 0;

      while (attempt < MAX_RETRIES) {
        try {
          const value = message.value?.toString();
          if (!value) {
            console.warn(`[issue-report-consumer] Empty message on ${topic}:${partition}`);
            return;
          }

          const event = JSON.parse(value);
          const issueId = event.issue_id ?? `ISS-${crypto.randomUUID().slice(0, 8)}`;

          const issue = await Issue.create({
            issue_id: issueId,
            run_id: event.run_id,
            trigger_timestamp: event.trigger_timestamp ?? new Date(),
            gps_coordinates: event.gps_coordinates,
            category: event.category ?? 'Other',
            severity: event.severity ?? 'Medium',
            takeover_type: event.takeover_type,
            data_snapshot_url: event.data_snapshot_url,
            environment_tags: event.environment_tags,
            description: event.description,
            status: 'New',
          });

          await executeTransition(issue.issue_id, 'Triage', 'system:kafka-consumer', 'Auto-advance on ingest');

          console.log(`[issue-report-consumer] Created & triaged issue ${issueId}`);
          return;
        } catch (err) {
          attempt++;
          console.error(
            `[issue-report-consumer] Attempt ${attempt}/${MAX_RETRIES} failed:`,
            err instanceof Error ? err.message : err,
          );
          if (attempt >= MAX_RETRIES) {
            console.error(
              `[issue-report-consumer] Exhausted retries for message on ${topic}:${partition}, offset ${message.offset}`,
            );
          }
        }
      }
    },
  });

  console.log(`[issue-report-consumer] Listening on topic "${TOPIC}"`);
}

export async function stopIssueReportConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
  }
}
