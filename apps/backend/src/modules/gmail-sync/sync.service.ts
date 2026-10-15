import type { Prisma } from "@prisma/client";
import type { TransactionRepository } from "../transactions/index.js";
import type { ParsingQueueProducer } from "../parsing/index.js";
import { GmailTokenExpiredError } from "./gmailApi.service.js";
import type { GmailConnectionRepository } from "./gmailConnection.repository.js";
import type { SyncJobRepository } from "./syncJob.repository.js";

const BACKFILL_MONTHS = 3;

// Narrow contract for what sync needs from the Gmail API (lets tests inject a fake
// without standing up googleapis). GmailApiService satisfies it structurally.
export interface GmailMessageSource {
  buildSyncQuery(afterDate: Date): string;
  listAllowlistedMessageIds(userId: string, query: string): Promise<string[]>;
}

// Minimal slice of PrismaClient the service needs to run multi-repository writes
// atomically. PrismaClient satisfies it; tests fake it with `(fn) => fn(stubTx)`.
export interface TransactionRunner {
  $transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

export interface SyncServiceDeps {
  db: TransactionRunner;
  gmail: GmailMessageSource;
  connections: GmailConnectionRepository;
  syncJobs: SyncJobRepository;
  transactions: TransactionRepository;
  parsingQueue: ParsingQueueProducer;
}

export class SyncService {
  constructor(private readonly deps: SyncServiceDeps) {}

  async runGmailSync(userId: string, mode: "backfill" | "incremental") {
    const { db, gmail, connections, syncJobs, transactions, parsingQueue } = this.deps;

    const connection = await connections.findByUserId(userId);
    if (!connection) {
      return;
    }

    const syncJob = await syncJobs.createRunning(userId);

    const afterDate =
      mode === "backfill" || !connection.lastSyncedAt
        ? monthsAgo(BACKFILL_MONTHS)
        : connection.lastSyncedAt;

    try {
      const query = gmail.buildSyncQuery(afterDate);
      const messageIds = await gmail.listAllowlistedMessageIds(userId, query);

      // Cost-saving pre-filter: skip enqueueing parsing jobs for messages we already have a
      // Transaction for. The parsing worker also re-checks this at insert time (see
      // docs/TASKS.md Fase 2 "Dedupe check by gmail_message_id sebelum insert") since sync
      // runs can race with each other (manual trigger + repeatable job).
      const existingIds = await transactions.existingGmailMessageIds(messageIds);
      const newMessageIds = messageIds.filter((id) => !existingIds.has(id));

      for (const gmailMessageId of newMessageIds) {
        await parsingQueue.enqueueParseEmail({ userId, gmailMessageId, syncJobId: syncJob.id });
      }

      await db.$transaction(async (tx) => {
        await syncJobs.markCompleted(syncJob.id, messageIds.length, tx);
        await connections.markSynced(userId, tx);
      });
    } catch (err) {
      if (err instanceof GmailTokenExpiredError) {
        await db.$transaction(async (tx) => {
          await syncJobs.markFailed(syncJob.id, "token_expired", tx);
          await connections.markTokenExpired(userId, tx);
        });
        return;
      }

      await syncJobs.markFailed(syncJob.id, err instanceof Error ? err.message : String(err));
      throw err; // unexpected error - let BullMQ's retry policy handle it, don't crash the worker process
    }
  }
}

function monthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}
