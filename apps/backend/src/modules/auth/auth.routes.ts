import type { FastifyInstance } from "fastify";
import { AuthService, InvalidGoogleTokenError } from "./auth.service.js";
import { requireAuth } from "./authMiddleware.js";

export interface AuthRoutesDeps {
  authService: AuthService;
}

export function authRoutes(deps: AuthRoutesDeps) {
  return async function routes(app: FastifyInstance) {
    app.post("/auth/google", async (request, reply) => {
      const body = request.body as { idToken?: string } | undefined;
      if (!body?.idToken) {
        return reply.code(400).send({ error: "idToken is required" });
      }

      try {
        const { token, user } = await deps.authService.loginWithGoogle(body.idToken);
        return { token, user: { id: user.id, email: user.email, name: user.name } };
      } catch (err) {
        if (err instanceof InvalidGoogleTokenError) {
          request.log.warn({ errMessage: err.message }, "Google ID token verification failed");
          return reply.code(401).send({ error: "Invalid Google ID token" });
        }
        throw err;
      }
    });

    app.get("/auth/me", { preHandler: requireAuth }, async (request, reply) => {
      const user = await deps.authService.getUserById(request.userId!);
      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }
      return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
    });
  };
}
