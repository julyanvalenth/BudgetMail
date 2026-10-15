import { createContainer } from "../container.js";
import { startGmailSyncWorker } from "../modules/gmail-sync/index.js";
import { startTransactionParsingWorker } from "../modules/parsing/index.js";

const container = createContainer();

const gmailSyncWorker = startGmailSyncWorker(container.redis, container.syncService);
const transactionParsingWorker = startTransactionParsingWorker(
  container.redis,
  container.parsingService,
);

gmailSyncWorker.on("failed", (job, err) => {
  console.error(`[gmail-sync] job ${job?.id} failed: ${err.message}`);
});
transactionParsingWorker.on("failed", (job, err) => {
  console.error(`[transaction-parsing] job ${job?.id} failed: ${err.message}`);
});

console.log("Workers started: gmail-sync, transaction-parsing");
