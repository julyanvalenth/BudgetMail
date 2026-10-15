import crypto from "node:crypto";

process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
process.env.JWT_SECRET = "test-jwt-secret-do-not-use-in-prod";
