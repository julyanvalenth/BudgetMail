import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { decryptToken } from "../../shared/crypto.js";
import { buildAllowlistQuery, type FetchedEmail } from "../parsing/index.js";
import type { GmailConnectionRepository } from "./gmailConnection.repository.js";

export class GmailTokenExpiredError extends Error {
  constructor() {
    super("Gmail refresh token is no longer valid");
  }
}

function isAuthError(err: unknown): boolean {
  const status =
    (err as { code?: number }).code ?? (err as { response?: { status?: number } }).response?.status;
  return status === 401 || status === 403;
}

export interface GoogleApiCredentials {
  clientId: string;
  clientSecret: string;
}

// Adapter around the Gmail REST API. Also satisfies the parsing module's
// EmailFetcher contract (fetchEmail) structurally.
export class GmailApiService {
  constructor(
    private readonly connections: GmailConnectionRepository,
    private readonly credentials: GoogleApiCredentials,
  ) {}

  private async buildGmailClient(userId: string) {
    const connection = await this.connections.findByUserId(userId);
    if (!connection) {
      throw new Error("Gmail not connected for this user");
    }
    const oauth2Client = new OAuth2Client(this.credentials.clientId, this.credentials.clientSecret);
    oauth2Client.setCredentials({
      refresh_token: decryptToken(connection.refreshTokenEncrypted),
    });
    return google.gmail({ version: "v1", auth: oauth2Client });
  }

  buildSyncQuery(afterDate: Date): string {
    const epochSeconds = Math.floor(afterDate.getTime() / 1000);
    return `${buildAllowlistQuery()} after:${epochSeconds}`;
  }

  async listAllowlistedMessageIds(userId: string, query: string): Promise<string[]> {
    const gmail = await this.buildGmailClient(userId);
    const ids: string[] = [];
    let pageToken: string | undefined;

    try {
      do {
        const response = await gmail.users.messages.list({
          userId: "me",
          q: query,
          pageToken,
          maxResults: 100,
        });
        for (const message of response.data.messages ?? []) {
          if (message.id) ids.push(message.id);
        }
        pageToken = response.data.nextPageToken ?? undefined;
      } while (pageToken);
    } catch (err) {
      if (isAuthError(err)) {
        throw new GmailTokenExpiredError();
      }
      throw err;
    }

    return ids;
  }

  // format: "metadata" (not "full") intentionally - we only need the From/Date headers
  // and Gmail's auto-generated snippet (a short preview), never the full email body.
  // This keeps raw_snippet retention minimal per PRD's data-retention principle.
  async fetchEmail(userId: string, gmailMessageId: string): Promise<FetchedEmail> {
    const gmail = await this.buildGmailClient(userId);
    try {
      const response = await gmail.users.messages.get({
        userId: "me",
        id: gmailMessageId,
        format: "metadata",
        metadataHeaders: ["From", "Date"],
      });
      const headers = response.data.payload?.headers ?? [];
      const from = headers.find((header) => header.name === "From")?.value ?? "";
      const date = headers.find((header) => header.name === "Date")?.value ?? "";
      return { gmailMessageId, from, date, snippet: response.data.snippet ?? "" };
    } catch (err) {
      if (isAuthError(err)) {
        throw new GmailTokenExpiredError();
      }
      throw err;
    }
  }
}
