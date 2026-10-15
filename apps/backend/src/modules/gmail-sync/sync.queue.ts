import { Queue } from "bullmq";
import type { Redis } from "ioredis";
import { GMAIL_SYNC_QUEUE, type GmailSyncJobData } from "../../shared/queues.js";

// Repeatable-job scheduler id is deterministic per user so connect/disconnect can
// upsert or remove it idempotently.
export function gmailSyncSchedulerId(userId: string): string {
  return `gmail-sync:${userId}`;
}

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export interface SyncQueueProducer {
  scheduleIncrementalSync(userId: string): Promise<void>;
  unscheduleIncrementalSync(userId: string): Promise<void>;
  enqueueBackfillSync(userId: string): Promise<void>;
  enqueueManualSync(userId: string): Promise<void>;
}

export class BullMqSyncQueueProducer implements SyncQueueProducer {
  private readonly queue: Queue<GmailSyncJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue(GMAIL_SYNC_QUEUE, { connection });
  }

  async scheduleIncrementalSync(userId: string): Promise<void> {
    await this.queue.upsertJobScheduler(
      gmailSyncSchedulerId(userId),
      { every: THIRTY_MINUTES_MS },
      { name: "incremental-sync", data: { userId, mode: "incremental" } },
    );
  }

  async unscheduleIncrementalSync(userId: string): Promise<void> {
    await this.queue.removeJobScheduler(gmailSyncSchedulerId(userId));
  }

  async enqueueBackfillSync(userId: string): Promise<void> {
    await this.queue.add("backfill-sync", { userId, mode: "backfill" });
  }

  async enqueueManualSync(userId: string): Promise<void> {
    await this.queue.add("manual-sync", { userId, mode: "incremental" });
  }
}
