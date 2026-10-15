import { PrismaClient } from "@prisma/client";

// Factory instead of a module-level singleton: the composition root (container.ts)
// owns the single instance and injects it into repositories, so tests can substitute
// fakes without touching module state.
export function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}
