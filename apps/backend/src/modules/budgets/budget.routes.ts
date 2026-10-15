import type { FastifyInstance } from "fastify";
import type { CopyBudgetsInput, UpsertBudgetInput } from "@budgetmail/shared-types";
import { currentMonth, MONTH_PATTERN } from "../../shared/month.js";
import { requireAuth } from "../auth/index.js";
import type { BudgetService } from "./budget.service.js";

export interface BudgetRoutesDeps {
  budgetService: BudgetService;
}

const month = { type: "string", pattern: MONTH_PATTERN } as const;

const listSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: { month },
  },
} as const;

const upsertSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["categoryId", "month", "amountLimit"],
    properties: {
      categoryId: { type: "string", minLength: 1, maxLength: 64 },
      month,
      amountLimit: { type: "number", exclusiveMinimum: 0, maximum: 999_999_999_999 },
    },
  },
} as const;

const copySchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["fromMonth", "toMonth"],
    properties: { fromMonth: month, toMonth: month },
  },
} as const;

const idParams = {
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", minLength: 1, maxLength: 64 } },
  },
} as const;

export function budgetRoutes(deps: BudgetRoutesDeps) {
  const { budgetService } = deps;

  return async function routes(app: FastifyInstance) {
    app.addHook("onRequest", requireAuth);

    app.get("/budgets", { schema: listSchema }, async (request) => {
      const query = request.query as { month?: string };
      return {
        items: await budgetService.listProgress(request.userId!, query.month ?? currentMonth()),
      };
    });

    app.post("/budgets", { schema: upsertSchema }, async (request) => {
      return budgetService.upsert(request.userId!, request.body as UpsertBudgetInput);
    });

    app.post("/budgets/copy", { schema: copySchema }, async (request) => {
      return budgetService.copy(request.userId!, request.body as CopyBudgetsInput);
    });

    app.delete("/budgets/:id", { schema: idParams }, async (request, reply) => {
      const { id } = request.params as { id: string };
      await budgetService.remove(request.userId!, id);
      return reply.code(204).send();
    });
  };
}
