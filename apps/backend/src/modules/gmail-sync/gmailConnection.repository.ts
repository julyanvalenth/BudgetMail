import type { GmailConnection, Prisma, PrismaClient } from "@prisma/client";

export interface GmailConnectionRepository {
  findByUserId(userId: string): Promise<GmailConnection | null>;
  saveConnection(
    userId: string,
    refreshTokenEncrypted: string,
    scope: string,
  ): Promise<GmailConnection>;
  markSynced(userId: string, tx?: Prisma.TransactionClient): Promise<void>;
  markTokenExpired(userId: string, tx?: Prisma.TransactionClient): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

export class PrismaGmailConnectionRepository implements GmailConnectionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByUserId(userId: string): Promise<GmailConnection | null> {
    return this.prisma.gmailConnection.findUnique({ where: { userId } });
  }

  saveConnection(
    userId: string,
    refreshTokenEncrypted: string,
    scope: string,
  ): Promise<GmailConnection> {
    return this.prisma.gmailConnection.upsert({
      where: { userId },
      update: { refreshTokenEncrypted, scope, syncStatus: "connected" },
      create: { userId, refreshTokenEncrypted, scope, syncStatus: "connected" },
    });
  }

  async markSynced(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).gmailConnection.update({
      where: { userId },
      data: { lastSyncedAt: new Date(), syncStatus: "connected" },
    });
  }

  async markTokenExpired(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).gmailConnection.update({
      where: { userId },
      data: { syncStatus: "token_expired" },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.gmailConnection.delete({ where: { userId } });
  }
}
