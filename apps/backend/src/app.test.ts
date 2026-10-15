import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { createContainer } from "./container.js";

// One container for the whole file: constructing it creates BullMQ queue handles
// (harmless without Redis - connection errors are logged, not thrown), and the
// routes under test never reach a repository because they fail auth first.
const container = createContainer();

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const app = buildApp(container);
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok" });
  });
});

describe("auth middleware", () => {
  it("rejects protected routes without a bearer token", async () => {
    const app = buildApp(container);
    const response = await app.inject({ method: "GET", url: "/auth/me" });
    expect(response.statusCode).toBe(401);
  });

  it("rejects protected routes with a malformed token", async () => {
    const app = buildApp(container);
    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: "Bearer not-a-real-token" },
    });
    expect(response.statusCode).toBe(401);
  });
});
