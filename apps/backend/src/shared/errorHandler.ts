import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { HttpError } from "./errors.js";

// Every error reaches the client as { error: string }.
export function errorHandler(err: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (err instanceof HttpError) {
    return reply.code(err.statusCode).send({ error: err.message });
  }
  if (err.validation) {
    return reply.code(400).send({ error: err.message });
  }
  if (err.statusCode && err.statusCode < 500) {
    return reply.code(err.statusCode).send({ error: err.message });
  }
  // Never log the raw error. gaxios errors carry request configs with OAuth secrets,
  // and Prisma messages include the query arguments (merchants, amounts, snippets).
  if (err.name.startsWith("PrismaClient")) {
    request.log.error({ errName: err.name, errCode: err.code }, "Unhandled database error");
  } else {
    request.log.error({ errMessage: err.message, stack: err.stack }, "Unhandled error");
  }
  return reply.code(500).send({ error: "Internal server error" });
}
