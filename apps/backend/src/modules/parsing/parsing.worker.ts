import { Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import { TRANSACTION_PARSING_QUEUE, type TransactionParsingJobData } from "../../shared/queues.js";
import type { EmailParsingService } from "./emailParsing.service.js";

export function startTransactionParsingWorker(
  connection: Redis,
  parsingService: EmailParsingService,
) {
  return new Worker<TransactionParsingJobData>(
    TRANSACTION_PARSING_QUEUE,
    (job: Job<TransactionParsingJobData>) => parsingService.parseEmail(job.data),
    { connection },
  );
}
