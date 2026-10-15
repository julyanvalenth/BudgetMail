// Queue contracts shared between producers and workers. Only names and payload
// types live here - Queue/Worker instances are constructed by each module's
// producer/worker factory with the Redis connection injected (see container.ts).

export const GMAIL_SYNC_QUEUE = "gmail-sync";
export const TRANSACTION_PARSING_QUEUE = "transaction-parsing";

export interface GmailSyncJobData {
  userId: string;
  mode: "backfill" | "incremental";
}

export interface TransactionParsingJobData {
  userId: string;
  gmailMessageId: string;
  syncJobId: string;
}
