import { Redis } from "ioredis";
import { env } from "./env.js";

// Shared connection for BullMQ queues/workers, created once by the composition root.
// BullMQ requires maxRetriesPerRequest: null on the connection it manages.
export function createRedisConnection(): Redis {
  const connection = new Redis(env.redisUrl || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  // ioredis emits "error" on every failed connection attempt - without a listener, Node
  // treats that as an unhandled error and can crash the process. BullMQ also connects
  // eagerly on Queue construction regardless of lazyConnect, so this fires immediately
  // whenever Redis isn't reachable (expected in local dev before `docker compose up`).
  connection.on("error", (err) => {
    console.error(`[redis] connection error: ${err.message}`);
  });

  return connection;
}
