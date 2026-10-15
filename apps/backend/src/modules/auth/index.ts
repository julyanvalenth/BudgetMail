// Public API of the auth module - other modules import only from here.
export { authRoutes } from "./auth.routes.js";
export { AuthService, InvalidGoogleTokenError } from "./auth.service.js";
export { requireAuth } from "./authMiddleware.js";
export { GoogleAuthGateway } from "./googleAuth.gateway.js";
export type { GmailTokens, GoogleUserProfile } from "./googleAuth.gateway.js";
export { PrismaUserRepository } from "./user.repository.js";
export type { UserRepository } from "./user.repository.js";
