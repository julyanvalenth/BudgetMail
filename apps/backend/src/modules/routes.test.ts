import Fastify from "fastify";
import { beforeEach, describe, expect, it } from "vitest";
import { errorHandler } from "../shared/errorHandler.js";
import { signSession } from "../shared/jwt.js";
import {
  InMemoryBudgetRepository,
  InMemoryCategoryRepository,
  InMemoryTransactionRepository,
  makeCategory,
} from "../testing/fakes.js";
import { budgetRoutes, BudgetService } from "./budgets/index.js";
import { categoryRoutes, CategoryService } from "./categories/index.js";
import { dashboardRoutes, DashboardService } from "./dashboard/index.js";
import { transactionRoutes, TransactionService } from "./transactions/index.js";

// Route tests (auth, validation, status codes) against in-memory repositories.

const USER = "user-1";
const auth = { authorization: `Bearer ${signSession(USER)}` };
const otherAuth = { authorization: `Bearer ${signSession("user-2")}` };

function buildTestApp() {
  const categories = new InMemoryCategoryRepository([
    makeCategory({ id: "food", name: "Makanan", type: "expense" }),
    makeCategory({ id: "salary", name: "Gaji", type: "income" }),
  ]);
  const transactions = new InMemoryTransactionRepository(categories);
  const budgets = new InMemoryBudgetRepository(categories);

  const app = Fastify();
  app.setErrorHandler(errorHandler);
  app.register(categoryRoutes({ categoryService: new CategoryService(categories) }));
  app.register(
    transactionRoutes({ transactionService: new TransactionService({ transactions, categories }) }),
  );
  app.register(
    budgetRoutes({ budgetService: new BudgetService({ budgets, categories, transactions }) }),
  );
  app.register(
    dashboardRoutes({
      dashboardService: new DashboardService({ transactions, categories, budgets }),
    }),
  );
  return { app, transactions };
}

const validTransaction = {
  merchant: "Kopi Kenangan",
  amount: 32000,
  type: "expense",
  categoryId: "food",
  transactionDate: "2026-10-14T05:00:00.000Z",
};

describe("Fase 3-4 routes", () => {
  let app: ReturnType<typeof buildTestApp>["app"];
  let transactions: InMemoryTransactionRepository;

  beforeEach(() => {
    ({ app, transactions } = buildTestApp());
  });

  it.each([
    ["GET", "/transactions"],
    ["POST", "/transactions"],
    ["GET", "/categories"],
    ["GET", "/budgets"],
    ["GET", "/dashboard/summary"],
  ] as const)("%s %s requires auth before validating input", async (method, url) => {
    const response = await app.inject({ method, url, payload: method === "POST" ? {} : undefined });
    expect(response.statusCode).toBe(401);
  });

  it("creates, lists, edits and deletes a manual transaction", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/transactions",
      headers: auth,
      payload: validTransaction,
    });
    expect(created.statusCode).toBe(201);
    const { id } = created.json();

    const list = await app.inject({
      method: "GET",
      url: "/transactions?month=2026-10",
      headers: auth,
    });
    expect(list.json().items).toHaveLength(1);

    const patched = await app.inject({
      method: "PATCH",
      url: `/transactions/${id}`,
      headers: auth,
      payload: { amount: 35000 },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().amount).toBe(35000);

    const removed = await app.inject({
      method: "DELETE",
      url: `/transactions/${id}`,
      headers: auth,
    });
    expect(removed.statusCode).toBe(204);
    expect(transactions.rows).toHaveLength(0);
  });

  it("returns { error } with 400 for invalid payloads", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/transactions",
      headers: auth,
      payload: { ...validTransaction, amount: -5 },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toHaveProperty("error");
  });

  it("rejects malformed months", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/dashboard/summary?month=2026-13",
      headers: auth,
    });
    expect(response.statusCode).toBe(400);
  });

  it("hides other users' transactions behind 404", async () => {
    const row = transactions.seed({ userId: USER, amount: 1 });
    const response = await app.inject({
      method: "GET",
      url: `/transactions/${row.id}`,
      headers: otherAuth,
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Transaksi tidak ditemukan" });
  });

  it("creates custom categories and rejects case-insensitive duplicates", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/categories",
      headers: auth,
      payload: { name: "Kopi", type: "expense" },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ name: "Kopi", icon: "tag", isDefault: false });

    const duplicate = await app.inject({
      method: "POST",
      url: "/categories",
      headers: auth,
      payload: { name: "makanan", type: "expense" },
    });
    expect(duplicate.statusCode).toBe(409);
  });

  it("sets a budget and reports it on the dashboard", async () => {
    await app.inject({
      method: "POST",
      url: "/transactions",
      headers: auth,
      payload: validTransaction,
    });
    const budget = await app.inject({
      method: "POST",
      url: "/budgets",
      headers: auth,
      payload: { categoryId: "food", month: "2026-10", amountLimit: 40000 },
    });
    expect(budget.statusCode).toBe(200);
    expect(budget.json()).toMatchObject({ spent: 32000, state: "warning" });

    const summary = await app.inject({
      method: "GET",
      url: "/dashboard/summary?month=2026-10",
      headers: auth,
    });
    expect(summary.json()).toMatchObject({
      totalExpense: 32000,
      budgets: [{ category: { id: "food" } }],
    });
  });
});
