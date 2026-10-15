import type { FastifyInstance } from "fastify";
import { currentMonth, MONTH_PATTERN } from "../../shared/month.js";
import { requireAuth } from "../auth/index.js";
import type { DashboardService } from "./dashboard.service.js";

export interface DashboardRoutesDeps {
  dashboardService: DashboardService;
}

const summarySchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: { month: { type: "string", pattern: MONTH_PATTERN } },
  },
} as const;

export function dashboardRoutes(deps: DashboardRoutesDeps) {
  return async function routes(app: FastifyInstance) {
    app.addHook("onRequest", requireAuth);

    app.get("/dashboard/summary", { schema: summarySchema }, async (request) => {
      const query = request.query as { month?: string };
      return deps.dashboardService.summary(request.userId!, query.month ?? currentMonth());
    });
  };
}
