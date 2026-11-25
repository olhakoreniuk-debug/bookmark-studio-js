import { randomBytes } from "node:crypto";
import { config } from "./config.js";
import { validateBookmark } from "./validation.js";
import { readJson, sendJson } from "./utils.js";

function requiresOwner(method, pathname) {
  return (method === "GET" && pathname === "/api/me") ||
    (method === "POST" && (pathname === "/api/bookmarks" || shareAction.test(pathname))) ||
    (method === "DELETE" && pathname.startsWith("/api/bookmarks/"));
}

const shareAction = /^\/api\/bookmarks\/([^/]+)\/share$/;

async function handleRoute(request, pathname, store, reply) {
  const share = shareAction.exec(pathname);
  if (request.method === "POST" && share) {
    let id;
    try {
      id = decodeURIComponent(share[1]);
    } catch {
      return reply(400, { error: "Invalid bookmark ID." });
    }
    const token = await store.share(id, randomBytes(32).toString("hex"));
    if (!token) return reply(404, { error: "Bookmark not found" });
    return reply(200, { token });
  }
  if (request.method === "GET" && pathname.startsWith("/api/shared/")) {
    const token = pathname.slice("/api/shared/".length);
    const bookmark = /^[a-f0-9]{64}$/.test(token) && await store.findShared(token);
    if (!bookmark) return reply(404, { error: "Shared bookmark not found." });
    const { title, description, cover, url, note, tags = [], category = "" } = bookmark;
    return reply(200, { title, description, cover, url, note, tags, category });
  }
  if (request.method === "GET" && pathname === "/api/me") {
    return reply(200, { authorized: true });
  }
  if (request.method === "GET" && pathname === "/api/bookmarks") {
    return reply(200, await store.list());
  }
  if (request.method === "POST" && pathname === "/api/bookmarks") {
    let bookmark;
    try {
      bookmark = validateBookmark(await readJson(request));
    } catch (error) {
      return reply(error.status || 400, { error: error.message });
    }
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
      if (requiresOwner(request.method, pathname) &&
          !(await verifyOwner(request.headers.authorization || ""))) {
        return reply(401, { error: "Google sign-in required." });
      }
      return await handleRoute(request, pathname, store, reply);
    } catch (error) {
      console.error(error);
      const status = error.status || 500;
      return reply(status, { error: status < 500 ? error.message : "Unexpected server error." });
    }
  };
}
