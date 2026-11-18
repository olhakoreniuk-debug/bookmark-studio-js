import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

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

export function validateBookmark(payload = {}) {
  const url = String(payload.url || "").trim();
  const title = String(payload.title || "").trim();
  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Enter a complete URL using http:// or https://.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
    throw new Error("Enter a complete URL using http:// or https://.");
  }
  if (!title) throw new Error("A bookmark title is required.");
  if (!Array.isArray(payload.tags ?? [])) throw new Error("Tags must be a list.");

  const createdAt = Number(payload.createdAt || Date.now());
  if (!Number.isFinite(createdAt)) throw new Error("createdAt must be a number.");

  return {
    id: String(payload.id || randomUUID()),
    url,
    title,
    description: String(payload.description || "").trim(),
    cover: String(payload.cover || "").trim(),
    note: String(payload.note || "").trim(),
    tags: (payload.tags || []).map((tag) => String(tag).trim()).filter(Boolean),
    createdAt: Math.trunc(createdAt),
    category: String(payload.category || "").trim(),
    example: false,
  };
}

export class JsonBookmarkStore {
  constructor(dataPath = config.dataPath) {
    this.dataPath = dataPath;
  }

  async initialize() {
    try {
      await readFile(this.dataPath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await this.#write([]);
    }
  }

  async #read() {
    return JSON.parse(await readFile(this.dataPath, "utf8"));
  }

  async #write(bookmarks) {
    const temporaryPath = `${this.dataPath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(bookmarks, null, 2)}\n`, "utf8");
    await rename(temporaryPath, this.dataPath);
  }

  async list() {
    return (await this.#read()).sort((a, b) => b.createdAt - a.createdAt);
  }

  async upsert(bookmark) {
    const bookmarks = await this.#read();
    const index = bookmarks.findIndex((item) => item.id === bookmark.id);
    if (index === -1) bookmarks.push(bookmark);
    else bookmarks[index] = bookmark;
    await this.#write(bookmarks);
    return bookmark;
  }

  async delete(id) {
    const bookmarks = await this.#read();
    const remaining = bookmarks.filter((item) => item.id !== id);
    if (remaining.length === bookmarks.length) return false;
    await this.#write(remaining);
    return true;
  }

  async health() {
    await this.#read();
  }
}

export class PostgresBookmarkStore {
  constructor(pool) {
    this.pool = pool;
  }

  async initialize() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        cover TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at BIGINT NOT NULL,
        category TEXT NOT NULL DEFAULT ''
      )
    `);
    await this.pool.query(
      "ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT ''",
    );
  }

  static #fromRow(row) {
    return {
      id: row.id,
      url: row.url,
      title: row.title,
      description: row.description,
      cover: row.cover,
      note: row.note,
      tags: row.tags,
      createdAt: Number(row.created_at),
      category: row.category,
      example: false,
    };
  }

  async list() {
    const { rows } = await this.pool.query(
      "SELECT * FROM bookmarks ORDER BY created_at DESC",
    );
    return rows.map(PostgresBookmarkStore.#fromRow);
  }

  async upsert(bookmark) {
    const values = [
      bookmark.id, bookmark.url, bookmark.title, bookmark.description,
      bookmark.cover, bookmark.note, JSON.stringify(bookmark.tags),
      bookmark.createdAt, bookmark.category,
    ];
    await this.pool.query(
      `INSERT INTO bookmarks
        (id, url, title, description, cover, note, tags, created_at, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
        url = EXCLUDED.url, title = EXCLUDED.title,
        description = EXCLUDED.description, cover = EXCLUDED.cover,
        note = EXCLUDED.note, tags = EXCLUDED.tags,
        created_at = EXCLUDED.created_at, category = EXCLUDED.category`,
      values,
    );
    return bookmark;
  }

  async delete(id) {
    const result = await this.pool.query("DELETE FROM bookmarks WHERE id = $1", [id]);
    return result.rowCount > 0;
  }

  async health() {
    await this.pool.query("SELECT 1");
  }
}

async function createStore() {
  if (!config.databaseUrl) return new JsonBookmarkStore();
  const { Pool } = await import("pg");
  return new PostgresBookmarkStore(new Pool({ connectionString: config.databaseUrl }));
}

async function createTokenVerifier() {
  if (!config.googleClientId || !config.ownerEmail) return async () => false;
  const { OAuth2Client } = await import("google-auth-library");
  const client = new OAuth2Client(config.googleClientId);
  return async (authorization = "") => {
    if (!authorization.startsWith("Bearer ")) return false;
    try {
      const ticket = await client.verifyIdToken({
        idToken: authorization.slice(7),
        audience: config.googleClientId,
      });
      const claims = ticket.getPayload();
      return claims?.email_verified === true && claims.email?.toLowerCase() === config.ownerEmail;
    } catch {
      return false;
    }
  };
}

function sendJson(response, status, payload, origin) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...(origin && config.allowedOrigins.has(origin)
      ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
      : {}),
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  response.end(body);
}

async function readJson(request) {
  const declaredLength = Number(request.headers["content-length"] || 0);
  if (declaredLength > 1_000_000) {
    const error = new Error("Request is too large");
    error.status = 413;
    throw error;
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 1_000_000) {
      const error = new Error("Request is too large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new Error("Invalid JSON body.");
  }
}

export function createApp({ store, verifyOwner }) {
  return async (request, response) => {
    const origin = request.headers.origin;
    const pathname = new URL(request.url, "http://localhost").pathname;
    const reply = (status, payload) => sendJson(response, status, payload, origin);

    try {
      if (request.method === "OPTIONS") return reply(204, {});
      if (request.method === "GET" && pathname === "/api/health") {
        await store.health();
        return reply(200, { status: "ok", database: config.databaseUrl ? "postgresql" : "json" });
      }

      const ownerOnly =
        (request.method === "GET" && pathname === "/api/me") ||
        (request.method === "POST" && pathname === "/api/bookmarks") ||
        (request.method === "DELETE" && pathname.startsWith("/api/bookmarks/"));
      if (ownerOnly && !(await verifyOwner(request.headers.authorization || ""))) {
        return reply(401, { error: "Google sign-in required." });
      }
      if (request.method === "GET" && pathname === "/api/me") {
        return reply(200, { authorized: true });
      }
      if (request.method === "GET" && pathname === "/api/bookmarks") {
        return reply(200, await store.list());
      }
      if (request.method === "POST" && pathname === "/api/bookmarks") {
        const bookmark = validateBookmark(await readJson(request));
        await store.upsert(bookmark);
        return reply(201, bookmark);
      }
      if (request.method === "DELETE" && pathname.startsWith("/api/bookmarks/")) {
        const id = pathname.slice("/api/bookmarks/".length);
        if (!id || id.includes("/")) return reply(404, { error: "Not found" });
        if (!(await store.delete(id))) return reply(404, { error: "Bookmark not found" });
        return reply(200, { deleted: true, id });
      }
      return reply(404, { error: "Not found" });
    } catch (error) {
      console.error(error);
      return reply(error.status || 400, { error: error.message || "Unexpected error" });
    }
  };
}

export async function startServer() {
  const store = await createStore();
  await store.initialize();
  const verifyOwner = await createTokenVerifier();
  const server = createServer(createApp({ store, verifyOwner }));
  server.listen(config.port, config.host, () => {
    console.log(`Bookmark Studio API running at http://${config.host}:${config.port}`);
    console.log(`Database: ${config.databaseUrl ? "PostgreSQL" : "JSON (local fallback)"}`);
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}


