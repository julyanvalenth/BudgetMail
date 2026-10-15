import { describe, expect, it } from "vitest";
import { signGmailOAuthState, signSession, verifyGmailOAuthState, verifySession } from "./jwt.js";

describe("session and OAuth-state tokens", () => {
  it("round-trips a session token", () => {
    const token = signSession("user-123");
    expect(verifySession(token).userId).toBe("user-123");
  });

  it("round-trips a gmail-oauth-state token", () => {
    const token = signGmailOAuthState("user-123");
    expect(verifyGmailOAuthState(token).userId).toBe("user-123");
  });

  it("rejects a gmail-oauth-state token when verified as a session", () => {
    const stateToken = signGmailOAuthState("user-123");
    expect(() => verifySession(stateToken)).toThrow();
  });

  it("rejects a session token when verified as gmail-oauth-state", () => {
    const sessionToken = signSession("user-123");
    expect(() => verifyGmailOAuthState(sessionToken)).toThrow();
  });
});
