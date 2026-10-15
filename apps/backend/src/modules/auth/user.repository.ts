import type { PrismaClient, User } from "@prisma/client";

export interface UserRepository {
  findOrCreate(googleId: string, email: string, name: string): Promise<User>;
  findById(id: string): Promise<User | null>;
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findOrCreate(googleId: string, email: string, name: string): Promise<User> {
    return this.prisma.user.upsert({
      where: { googleId },
      update: { email, name },
      create: { googleId, email, name },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
