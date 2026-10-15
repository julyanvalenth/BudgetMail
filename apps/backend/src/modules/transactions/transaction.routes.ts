import type { FastifyInstance } from "fastify";
import type {
  CreateTransactionInput,
  TransactionListQuery,
  UpdateTransactionInput,
} from "@budgetmail/shared-types";
import { MONTH_PATTERN } from "../../shared/month.js";
import { requireAuth } from "../auth/index.js";
import type { TransactionService } from "./transaction.service.js";

export interface TransactionRoutesDeps {
  transactionService: TransactionService;
}

// Mainly guards against DECIMAL(14,2) overflow.
const MAX_AMOUNT = 999_999_999_999;

const idParams = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string", minLength: 1, maxLength: 64 } },
} as const;

const fieldSchemas = {
  merchant: { type: "string", minLength: 1, maxLength: 120 },
  amount: { type: "number", exclusiveMinimum: 0, maximum: MAX_AMOUNT },
  type: { type: "string", enum: ["income", "expense"] },
  categoryId: { type: ["string", "null"], maxLength: 64 },
  transactionDate: { type: "string", format: "date-time" },
  status: { type: "string", enum: ["pending_review", "confirmed", "ignored"] },
} as const;

const listSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      month: { type: "string", pattern: MONTH_PATTERN },
      category: { type: "string", maxLength: 64 },
      status: fieldSchemas.status,
      type: fieldSchemas.type,
      cursor: { type: "string", maxLength: 64 },
      limit: { type: "integer", minimum: 1, maximum: 100 },
    },
  },
} as const;

const createSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["merchant", "amount", "type", "categoryId", "transactionDate"],
    properties: {
      merchant: fieldSchemas.merchant,
      amount: fieldSchemas.amount,
      type: fieldSchemas.type,
      categoryId: fieldSchemas.categoryId,
      transactionDate: fieldSchemas.transactionDate,
    },
  },
} as const;

const updateSchema = {
  params: idParams,
  body: {
    type: "object",
    additionalProperties: false,
    minProperties: 1,
    properties: fieldSchemas,
  },
} as const;

export function transactionRoutes(deps: TransactionRoutesDeps) {
  const { transactionService } = deps;

  return async function routes(app: FastifyInstance) {
    // onRequest so a missing token gets a 401 before body validation runs.
    app.addHook("onRequest", requireAuth);

    app.get("/transactions", { schema: listSchema }, async (request) => {
      return transactionService.list(request.userId!, request.query as TransactionListQuery);
    });

    app.get("/transactions/:id", { schema: { params: idParams } }, async (request) => {
      const { id } = request.params as { id: string };
      return transactionService.get(request.userId!, id);
    });

    app.post("/transactions", { schema: createSchema }, async (request, reply) => {
      const created = await transactionService.create(
        request.userId!,
        request.body as CreateTransactionInput,
      );
      return reply.code(201).send(created);
    });

    app.patch("/transactions/:id", { schema: updateSchema }, async (request) => {
      const { id } = request.params as { id: string };
      return transactionService.update(request.userId!, id, request.body as UpdateTransactionInput);
    });

    app.delete("/transactions/:id", { schema: { params: idParams } }, async (request, reply) => {
      const { id } = request.params as { id: string };
      await transactionService.remove(request.userId!, id);
      return reply.code(204).send();
    });
  };
}
