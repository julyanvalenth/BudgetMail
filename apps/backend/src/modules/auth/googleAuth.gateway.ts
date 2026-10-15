import { OAuth2Client } from "google-auth-library";

const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export interface GoogleUserProfile {
  googleId: string;
  email: string;
  name: string;
}

export interface GmailTokens {
  refreshToken: string;
  scope: string;
}

// Adapter around google-auth-library so services/routes depend on an injectable
// gateway instead of module-level OAuth2Client singletons.
export class GoogleAuthGateway {
  private readonly idTokenClient: OAuth2Client;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {
    this.idTokenClient = new OAuth2Client(clientId);
  }

  async verifyIdToken(idToken: string): Promise<GoogleUserProfile> {
    const ticket = await this.idTokenClient.verifyIdToken({
      idToken,
      audience: this.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new Error("Invalid Google ID token payload");
    }
    return { googleId: payload.sub, email: payload.email, name: payload.name ?? payload.email };
  }

  private buildGmailOAuthClient(redirectUri: string) {
    return new OAuth2Client(this.clientId, this.clientSecret, redirectUri);
  }

  // Incremental-consent URL: only requested when the user explicitly clicks
  // "Hubungkan Gmail", never at initial login.
  getGmailConsentUrl(redirectUri: string, state: string): string {
    const client = this.buildGmailOAuthClient(redirectUri);
    return client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [GMAIL_READONLY_SCOPE],
      state,
    });
  }

  async exchangeGmailCode(redirectUri: string, code: string): Promise<GmailTokens> {
    const client = this.buildGmailOAuthClient(redirectUri);
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error(
        "No refresh token returned by Google - user may need to revoke prior access at " +
          "https://myaccount.google.com/permissions and reconnect",
      );
    }
    return { refreshToken: tokens.refresh_token, scope: tokens.scope ?? GMAIL_READONLY_SCOPE };
  }

  async revokeToken(token: string): Promise<void> {
    const client = new OAuth2Client();
    await client.revokeToken(token);
  }
}
