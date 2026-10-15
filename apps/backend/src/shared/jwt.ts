import jwt from "jsonwebtoken";
import { env } from "./env.js";

interface SessionPayload {
  userId: string;
  purpose: "session";
}

interface GmailOAuthStatePayload {
  userId: string;
  purpose: "gmail_oauth_state";
}

// Mirrors crypto.ts's getKey() validation: fail loudly (but lazily, only when a
// token is actually signed/verified - not at import time, so /health stays up
// without full env config) rather than silently signing with a weak/empty secret.
function getJwtSecret(): string {
  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be set to a random string of at least 32 characters");
  }
  return env.jwtSecret;
}

export function signSession(userId: string): string {
  return jwt.sign({ userId, purpose: "session" } satisfies SessionPayload, getJwtSecret(), {
    expiresIn: "30d",
  });
}

export function verifySession(token: string): { userId: string } {
  const payload = jwt.verify(token, getJwtSecret()) as SessionPayload;
  if (payload.purpose !== "session") {
    throw new Error("Invalid token purpose");
  }
  return { userId: payload.userId };
}

// Short-lived signed state passed through the Gmail OAuth redirect so the
// public /gmail/callback route can identify which user is completing consent
// without requiring the browser to carry an Authorization header.
export function signGmailOAuthState(userId: string): string {
  return jwt.sign(
    { userId, purpose: "gmail_oauth_state" } satisfies GmailOAuthStatePayload,
    getJwtSecret(),
    { expiresIn: "10m" },
  );
}

export function verifyGmailOAuthState(token: string): { userId: string } {
  const payload = jwt.verify(token, getJwtSecret()) as GmailOAuthStatePayload;
  if (payload.purpose !== "gmail_oauth_state") {
    throw new Error("Invalid token purpose");
  }
  return { userId: payload.userId };
}
