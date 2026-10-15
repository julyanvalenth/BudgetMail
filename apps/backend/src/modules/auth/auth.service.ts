import type { User } from "@prisma/client";
import { signSession } from "../../shared/jwt.js";
import type { GoogleAuthGateway } from "./googleAuth.gateway.js";
import type { UserRepository } from "./user.repository.js";

// Typed error so the route can map "bad Google token" to 401 without
// swallowing unrelated failures (e.g. DB errors) behind the same status.
export class InvalidGoogleTokenError extends Error {
  constructor(cause: string) {
    super(`Google ID token verification failed: ${cause}`);
  }
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly googleAuth: GoogleAuthGateway,
  ) {}

  async loginWithGoogle(idToken: string): Promise<{ token: string; user: User }> {
    let profile;
    try {
      profile = await this.googleAuth.verifyIdToken(idToken);
    } catch (err) {
      throw new InvalidGoogleTokenError(err instanceof Error ? err.message : String(err));
    }
    const user = await this.users.findOrCreate(profile.googleId, profile.email, profile.name);
    return { token: signSession(user.id), user };
  }

  getUserById(id: string): Promise<User | null> {
    return this.users.findById(id);
  }
}
