import "dotenv/config";

const PLACEHOLDER_SECRETS = ["replace-with-a-long-random-secret", "change-me"];

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
  mongoDb: process.env.MONGODB_DB || "signcms_dev",
  jwtSecret: process.env.JWT_SECRET || "",
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  trustProxy: process.env.TRUST_PROXY === "true",
  maxUploadBytes: 200 * 1024 * 1024,
  pairingCodeTtlMs: 10 * 60 * 1000,
  offlineAfterMs: 45 * 1000,
};

/** Refuse to start with an unsafe configuration. */
export function assertConfig() {
  if (config.jwtSecret.length < 32 || PLACEHOLDER_SECRETS.includes(config.jwtSecret)) {
    throw new Error("JWT_SECRET must be set to a random value of at least 32 characters.");
  }
}
