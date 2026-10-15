import { Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import { GMAIL_SYNC_QUEUE, type GmailSyncJobData } from "../../shared/queues.js";
import type { SyncService } from "./sync.service.js";

export function startGmailSyncWorker(connection: Redis, syncService: SyncService) {
  return new Worker<GmailSyncJobData>(
    GMAIL_SYNC_QUEUE,
    (job: Job<GmailSyncJobData>) => syncService.runGmailSync(job.data.userId, job.data.mode),
    { connection },
  );
}
