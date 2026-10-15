import type { FastifyReply, FastifyRequest } from "fastify";
import { verifySession } from "../../shared/jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  if (!token) {
    return reply.code(401).send({ error: "Missing bearer token" });
  }
  try {
    const { userId } = verifySession(token);
    request.userId = userId;
  } catch {
    return reply.code(401).send({ error: "Invalid or expired token" });
  }
}
