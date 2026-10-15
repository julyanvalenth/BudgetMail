import type { Prisma, PrismaClient, SyncJob } from "@prisma/client";

export interface SyncJobRepository {
  createRunning(userId: string): Promise<SyncJob>;
  markCompleted(id: string, emailsScanned: number, tx?: Prisma.TransactionClient): Promise<void>;
  markFailed(id: string, errorMessage: string, tx?: Prisma.TransactionClient): Promise<void>;
  incrementTransactionsCreated(id: string): Promise<void>;
  findLatest(userId: string): Promise<SyncJob | null>;
}

export class PrismaSyncJobRepository implements SyncJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createRunning(userId: string): Promise<SyncJob> {
    return this.prisma.syncJob.create({ data: { userId, status: "running" } });
  }

  async markCompleted(
    id: string,
    emailsScanned: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await (tx ?? this.prisma).syncJob.update({
      where: { id },
      data: { status: "completed", finishedAt: new Date(), emailsScanned },
    });
  }

  async markFailed(id: string, errorMessage: string, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).syncJob.update({
      where: { id },
      data: { status: "failed", finishedAt: new Date(), errorMessage },
    });
  }

  async incrementTransactionsCreated(id: string): Promise<void> {
    await this.prisma.syncJob.update({
      where: { id },
      data: { transactionsCreated: { increment: 1 } },
    });
  }

  findLatest(userId: string): Promise<SyncJob | null> {
    return this.prisma.syncJob.findFirst({ where: { userId }, orderBy: { startedAt: "desc" } });
  }
}
