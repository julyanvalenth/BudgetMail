import Fastify from "fastify";
import cors from "@fastify/cors";
import type { Container } from "./container.js";
import { authRoutes } from "./modules/auth/index.js";
import { budgetRoutes } from "./modules/budgets/index.js";
import { categoryRoutes } from "./modules/categories/index.js";
import { dashboardRoutes } from "./modules/dashboard/index.js";
import { gmailRoutes } from "./modules/gmail-sync/index.js";
import { transactionRoutes } from "./modules/transactions/index.js";
import { errorHandler } from "./shared/errorHandler.js";

export function buildApp(container: Container) {
  const app = Fastify({
    logger: {
      serializers: {
        // Strip the query string from logged request URLs: GET /gmail/callback carries
        // a short-lived Google authorization code and a signed OAuth state token as
        // query params, which must never land in persisted request logs.
        req(request) {
          return {
            method: request.method,
            url: request.url.split("?")[0],
            remoteAddress: request.ip,
          };
        },
      },
    },
  });

  app.register(cors, { origin: true });

  app.setErrorHandler(errorHandler);

  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  app.register(authRoutes({ authService: container.authService }));
  app.register(
    gmailRoutes({
      connections: container.connections,
      syncJobs: container.syncJobs,
      googleAuth: container.googleAuth,
      syncQueue: container.syncQueue,
    }),
  );
  app.register(categoryRoutes({ categoryService: container.categoryService }));
  app.register(transactionRoutes({ transactionService: container.transactionService }));
  app.register(budgetRoutes({ budgetService: container.budgetService }));
  app.register(dashboardRoutes({ dashboardService: container.dashboardService }));

  return app;
}
