import { describe, expect, it } from "vitest";
import {
  buildAllowlistQuery,
  isAllowlistedSender,
  matchAllowlistedSender,
} from "./senderAllowlist.js";

describe("isAllowlistedSender", () => {
  it("matches an allowlisted domain with a display name", () => {
    expect(isAllowlistedSender("BCA <notifikasi@klikbca.com>")).toBe(true);
  });

  it("matches an allowlisted domain with a bare address", () => {
    expect(isAllowlistedSender("noreply@gopay.co.id")).toBe(true);
  });

  it("rejects a non-allowlisted domain", () => {
    expect(isAllowlistedSender("someone@gmail.com")).toBe(false);
  });

  it("does not match a lookalike domain via substring", () => {
    expect(isAllowlistedSender("attacker@notklikbca.com")).toBe(false);
    expect(isAllowlistedSender("attacker@klikbca.com.evil.com")).toBe(false);
  });
});

describe("matchAllowlistedSender", () => {
  it("returns the provider entry for an allowlisted sender", () => {
    expect(matchAllowlistedSender("BCA <notifikasi@klikbca.com>")?.id).toBe("bca");
  });

  it("returns undefined for an unknown sender", () => {
    expect(matchAllowlistedSender("someone@gmail.com")).toBeUndefined();
  });
});

describe("buildAllowlistQuery", () => {
  it("builds a Gmail search query combining all provider domains with OR", () => {
    const query = buildAllowlistQuery();
    expect(query).toMatch(/^from:\(.*@klikbca\.com.*\)$/);
    expect(query).toContain("OR");
  });
});
