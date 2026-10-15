import type { GmailConnection, Prisma, SyncJob, Transaction } from "@prisma/client";
import { describe, expect, it } from "vitest";
import type { TransactionParsingJobData } from "../../shared/queues.js";
import type { NewGmailTransaction, TransactionRepository } from "../transactions/index.js";
import { GmailTokenExpiredError } from "./gmailApi.service.js";
import type { GmailConnectionRepository } from "./gmailConnection.repository.js";
import { SyncService, type GmailMessageSource, type TransactionRunner } from "./sync.service.js";
import type { SyncJobRepository } from "./syncJob.repository.js";

// These tests exercise SyncService against in-memory fakes - the point of the
// repository/DI refactor is exactly that this orchestration logic is now testable
// without Postgres, Redis, or the Gmail API.

function makeConnection(overrides: Partial<GmailConnection> = {}): GmailConnection {
  return {
    id: "conn-1",
    userId: "user-1",
    refreshTokenEncrypted: "encrypted",
    scope: "gmail.readonly",
    syncStatus: "connected",
    lastSyncedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

class FakeConnections implements GmailConnectionRepository {
  markedSynced: string[] = [];
  markedTokenExpired: string[] = [];

  constructor(private readonly connection: GmailConnection | null) {}

  async findByUserId(userId: string) {
    return this.connection?.userId === userId ? this.connection : null;
  }
  async saveConnection(): Promise<GmailConnection> {
    throw new Error("not used in these tests");
  }
  async markSynced(userId: string, _tx?: Prisma.TransactionClient) {
    this.markedSynced.push(userId);
  }
  async markTokenExpired(userId: string, _tx?: Prisma.TransactionClient) {
    this.markedTokenExpired.push(userId);
  }
  async deleteByUserId() {}
}

class FakeSyncJobs implements SyncJobRepository {
  created: SyncJob[] = [];
  completed: Array<{ id: string; emailsScanned: number }> = [];
  failed: Array<{ id: string; errorMessage: string }> = [];

  async createRunning(userId: string): Promise<SyncJob> {
    const job: SyncJob = {
      id: `job-${this.created.length + 1}`,
      userId,
      status: "running",
      startedAt: new Date(),
      finishedAt: null,
      emailsScanned: 0,
      transactionsCreated: 0,
      errorMessage: null,
    };
    this.created.push(job);
    return job;
  }
  async markCompleted(id: string, emailsScanned: number, _tx?: Prisma.TransactionClient) {
    this.completed.push({ id, emailsScanned });
  }
  async markFailed(id: string, errorMessage: string, _tx?: Prisma.TransactionClient) {
    this.failed.push({ id, errorMessage });
  }
  async incrementTransactionsCreated() {}
  async findLatest(): Promise<SyncJob | null> {
    return this.created.at(-1) ?? null;
  }
}

async function notUsed(): Promise<never> {
  throw new Error("not used in these tests");
}

class FakeTransactions implements TransactionRepository {
  constructor(private readonly existing: Set<string> = new Set()) {}

  async findByGmailMessageId(): Promise<Transaction | null> {
    return null;
  }
  async existingGmailMessageIds(gmailMessageIds: string[]) {
    return new Set(gmailMessageIds.filter((id) => this.existing.has(id)));
  }
  async createFromGmail(_data: NewGmailTransaction): Promise<Transaction | null> {
    throw new Error("not used in these tests");
  }
  createManual = notUsed;
  list = notUsed;
  findOwned = notUsed;
  update = notUsed;
  delete = notUsed;
  totalsByCategory = notUsed;
  countByStatus = notUsed;
}

class FakeParsingQueue {
  enqueued: TransactionParsingJobData[] = [];

  async enqueueParseEmail(data: TransactionParsingJobData) {
    this.enqueued.push(data);
  }
}

function makeGmail(listResult: () => Promise<string[]>): GmailMessageSource {
  return {
    buildSyncQuery: (afterDate: Date) => `query after:${afterDate.toISOString()}`,
    listAllowlistedMessageIds: () => listResult(),
  };
}

// PrismaClient stand-in: runs the callback with a stub transaction client, which is
// all the fakes need since they ignore the tx parameter.
const fakeDb: TransactionRunner = {
  $transaction: (fn) => fn({} as Prisma.TransactionClient),
};

function makeService(overrides: {
  connections: FakeConnections;
  syncJobs?: FakeSyncJobs;
  transactions?: FakeTransactions;
  parsingQueue?: FakeParsingQueue;
  gmail?: GmailMessageSource;
}) {
  const syncJobs = overrides.syncJobs ?? new FakeSyncJobs();
  const parsingQueue = overrides.parsingQueue ?? new FakeParsingQueue();
  const service = new SyncService({
    db: fakeDb,
    gmail: overrides.gmail ?? makeGmail(async () => []),
    connections: overrides.connections,
    syncJobs,
    transactions: overrides.transactions ?? new FakeTransactions(),
    parsingQueue,
  });
  return { service, syncJobs, parsingQueue };
}

describe("SyncService.runGmailSync", () => {
  it("does nothing when the user has no Gmail connection", async () => {
    const connections = new FakeConnections(null);
    const { service, syncJobs } = makeService({ connections });

    await service.runGmailSync("user-1", "backfill");

    expect(syncJobs.created).toHaveLength(0);
  });

  it("enqueues parsing jobs only for new message ids and marks the sync completed", async () => {
    const connections = new FakeConnections(makeConnection());
    const { service, syncJobs, parsingQueue } = makeService({
      connections,
      gmail: makeGmail(async () => ["m1", "m2", "m3"]),
      transactions: new FakeTransactions(new Set(["m2"])),
    });

    await service.runGmailSync("user-1", "backfill");

    expect(parsingQueue.enqueued.map((job) => job.gmailMessageId)).toEqual(["m1", "m3"]);
    expect(parsingQueue.enqueued.every((job) => job.syncJobId === "job-1")).toBe(true);
    expect(syncJobs.completed).toEqual([{ id: "job-1", emailsScanned: 3 }]);
    expect(connections.markedSynced).toEqual(["user-1"]);
  });

  it("marks the connection token_expired without rethrowing when Gmail auth fails", async () => {
    const connections = new FakeConnections(makeConnection());
    const { service, syncJobs, parsingQueue } = makeService({
      connections,
      gmail: makeGmail(async () => {
        throw new GmailTokenExpiredError();
      }),
    });

    await expect(service.runGmailSync("user-1", "incremental")).resolves.toBeUndefined();

    expect(syncJobs.failed).toEqual([{ id: "job-1", errorMessage: "token_expired" }]);
    expect(connections.markedTokenExpired).toEqual(["user-1"]);
    expect(parsingQueue.enqueued).toHaveLength(0);
  });

  it("marks the job failed and rethrows on unexpected errors", async () => {
    const connections = new FakeConnections(makeConnection());
    const { service, syncJobs } = makeService({
      connections,
      gmail: makeGmail(async () => {
        throw new Error("gmail is down");
      }),
    });

    await expect(service.runGmailSync("user-1", "incremental")).rejects.toThrow("gmail is down");

    expect(syncJobs.failed).toEqual([{ id: "job-1", errorMessage: "gmail is down" }]);
  });
});
