import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  host: process.env.HOST || "0.0.0.0",
  port: Number(process.env.PORT || 8000),
  databaseUrl: (process.env.DATABASE_URL || "").trim(),
  allowedOrigins: new Set(
    (process.env.ALLOWED_ORIGIN ||
      "http://localhost:8080,http://127.0.0.1:5500,http://localhost:5500")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
  googleClientId: (process.env.GOOGLE_CLIENT_ID || "").trim(),
  ownerEmail: (process.env.OWNER_EMAIL || "").trim().toLowerCase(),
  dataPath: process.env.DATA_PATH || path.join(__dirname, "bookmarks.json"),
};
