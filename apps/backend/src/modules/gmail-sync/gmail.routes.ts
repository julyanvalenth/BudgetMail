import type { FastifyInstance } from "fastify";
import { requireAuth, type GoogleAuthGateway } from "../auth/index.js";
import { decryptToken, encryptToken } from "../../shared/crypto.js";
import { env } from "../../shared/env.js";
import { signGmailOAuthState, verifyGmailOAuthState } from "../../shared/jwt.js";
import type { GmailConnectionRepository } from "./gmailConnection.repository.js";
import type { SyncQueueProducer } from "./sync.queue.js";
import type { SyncJobRepository } from "./syncJob.repository.js";

export interface GmailRoutesDeps {
  connections: GmailConnectionRepository;
  syncJobs: SyncJobRepository;
  googleAuth: GoogleAuthGateway;
  syncQueue: SyncQueueProducer;
}

export function gmailRoutes(deps: GmailRoutesDeps) {
  const { connections, syncJobs, googleAuth, syncQueue } = deps;
  const redirectUri = `${env.publicBaseUrl}/gmail/callback`;

  return async function routes(app: FastifyInstance) {
    app.post("/gmail/connect", { preHandler: requireAuth }, async (request) => {
      const state = signGmailOAuthState(request.userId!);
      const url = googleAuth.getGmailConsentUrl(redirectUri, state);
      return { url };
    });

    // Public route: hit directly by Google's browser redirect, not by our JWT-authed
    // mobile client. Identity is carried by the short-lived signed `state` param instead.
    app.get("/gmail/callback", async (request, reply) => {
      const { code, state, error } = request.query as {
        code?: string;
        state?: string;
        error?: string;
      };

      if (error) {
        // Don't echo the query value back
        return reply.code(400).send({ error: "Google consent was not granted" });
      }
      if (!code || !state) {
        return reply.code(400).send({ error: "Missing code or state" });
      }

      let userId: string;
      try {
        ({ userId } = verifyGmailOAuthState(state));
      } catch {
        return reply.code(400).send({ error: "Invalid or expired state" });
      }

      let tokens: Awaited<ReturnType<GoogleAuthGateway["exchangeGmailCode"]>>;
      try {
        tokens = await googleAuth.exchangeGmailCode(redirectUri, code);
      } catch (err) {
        // Log only the message, never the raw error object: the underlying HTTP client
        // (gaxios) attaches the full request config to thrown errors, which for this
        // call includes GOOGLE_CLIENT_SECRET and the authorization code.
        request.log.error(
          { errMessage: err instanceof Error ? err.message : String(err) },
          "Failed to exchange Gmail OAuth code",
        );
        return reply.code(502).send({ error: "Failed to connect Gmail" });
      }

      await connections.saveConnection(userId, encryptToken(tokens.refreshToken), tokens.scope);

      // Kick off the one-time 3-month backfill and schedule the 30-minute repeatable sync.
      await syncQueue.enqueueBackfillSync(userId);
      await syncQueue.scheduleIncrementalSync(userId);

      return reply.redirect(`${env.mobileDeepLinkScheme}://gmail-connected`);
    });

    app.get("/gmail/status", { preHandler: requireAuth }, async (request) => {
      const connection = await connections.findByUserId(request.userId!);
      if (!connection) {
        return { status: "not_connected" as const };
      }
      // The app uses the latest run to show sync progress and announce new transactions.
      // errorMessage stays server-side.
      const latest = await syncJobs.findLatest(request.userId!);
      return {
        status: connection.syncStatus,
        lastSyncedAt: connection.lastSyncedAt,
        lastSync: latest && {
          id: latest.id,
          status: latest.status,
          startedAt: latest.startedAt,
          finishedAt: latest.finishedAt,
          transactionsCreated: latest.transactionsCreated,
        },
      };
    });

    // Manual trigger for pull-to-refresh in the mobile app.
    app.post("/gmail/sync", { preHandler: requireAuth }, async (request, reply) => {
      const connection = await connections.findByUserId(request.userId!);
      if (!connection) {
        return reply.code(404).send({ error: "Gmail not connected" });
      }
      await syncQueue.enqueueManualSync(request.userId!);
      return reply.code(202).send({ status: "sync_queued" });
    });

    app.delete("/gmail/disconnect", { preHandler: requireAuth }, async (request, reply) => {
      const connection = await connections.findByUserId(request.userId!);
      if (!connection) {
        return reply.code(404).send({ error: "Gmail not connected" });
      }

      try {
        await googleAuth.revokeToken(decryptToken(connection.refreshTokenEncrypted));
      } catch (err) {
        // Token may already be invalid/expired at Google's end - don't block local disconnect.
        // Log only the message, never the raw error object: gaxios errors carry the full
        // request config, which for a revoke call includes the plaintext refresh token.
        request.log.warn(
          { errMessage: err instanceof Error ? err.message : String(err) },
          "Failed to revoke Google token during disconnect",
        );
      }

      await syncQueue.unscheduleIncrementalSync(request.userId!);
      await connections.deleteByUserId(request.userId!);
      return { status: "not_connected" as const };
    });
  };
}
