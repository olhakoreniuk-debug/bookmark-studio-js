import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonBookmarkStore } from "./json-store.js";
import { createApp } from "./api.js";
import { validateBookmark } from "./validation.js";

const OWNER_TOKEN = "Bearer local-test-owner";
function fakeStore() {
  const records = new Map();
  return {
    async health() {},
    async list() { return [...records.values()].sort((a, b) => b.createdAt - a.createdAt); },
    async upsert(bookmark) { records.set(bookmark.id, bookmark); return bookmark; },
    async delete(id) { return records.delete(id); },
  };
}
async function startTestApi(t, store = fakeStore()) {
  const server = createServer(createApp({
    store,
    verifyOwner: async (authorization) => authorization === OWNER_TOKEN,
  }));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  return { store, url: `http://127.0.0.1:${server.address().port}` };
}
async function jsonRequest(url, route, { method = "GET", token = null, body, headers = {} } = {}) {
  const response = await fetch(url + route, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: token } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = response.status === 204 ? null : await response.json();
  return { response, data };
}
function example(id = "test-1") {
  return {
    id, url: "https://example.com/article", title: "An example",
    description: "Useful article", note: "Remember this", cover: "",
    category: "TECH", tags: ["node", "tests"], createdAt: 1700000000000,
  };
}

test("GET /api/health reports a healthy API", async (t) => {
  const { url } = await startTestApi(t);
  const { response, data } = await jsonRequest(url, "/api/health");
  assert.equal(response.status, 200);
  assert.equal(data.status, "ok");
});

test("GET /api/bookmarks is public and initially empty", async (t) => {
  const { url } = await startTestApi(t);
  const { response, data } = await jsonRequest(url, "/api/bookmarks");
  assert.equal(response.status, 200);
  assert.deepEqual(data, []);
});

test("GET /api/bookmarks lists newest first", async (t) => {
  const { url, store } = await startTestApi(t);
  await store.upsert(validateBookmark(example("old")));
  await store.upsert(validateBookmark({ ...example("new"), createdAt: 1800000000000 }));
  const { data } = await jsonRequest(url, "/api/bookmarks");
  assert.deepEqual(data.map((item) => item.id), ["new", "old"]);
});

test("GET /api/me requires owner authorization", async (t) => {
  const { url } = await startTestApi(t);
  assert.equal((await jsonRequest(url, "/api/me")).response.status, 401);
  assert.equal((await jsonRequest(url, "/api/me", { token: "Bearer wrong-user" })).response.status, 401);
  const owner = await jsonRequest(url, "/api/me", { token: OWNER_TOKEN });
  assert.equal(owner.response.status, 200);
  assert.deepEqual(owner.data, { authorized: true });
});

test("POST /api/bookmarks blocks anonymous and invalid tokens", async (t) => {
  const { url } = await startTestApi(t);
  for (const token of [null, "Bearer wrong-user"]) {
    assert.equal((await jsonRequest(url, "/api/bookmarks", {
      method: "POST", token, body: example(),
    })).response.status, 401);
  }
  assert.deepEqual((await jsonRequest(url, "/api/bookmarks", { token: OWNER_TOKEN })).data, []);
});

test("POST /api/bookmarks saves a valid bookmark for owner", async (t) => {
  const { url } = await startTestApi(t);
  const { response, data } = await jsonRequest(url, "/api/bookmarks", {
    method: "POST", token: OWNER_TOKEN, body: example(),
  });
  assert.equal(response.status, 201);
  assert.equal(data.title, "An example");
  assert.deepEqual(data.tags, ["node", "tests"]);
  assert.equal(data.category, "TECH");
  assert.equal(data.example, false);
  assert.equal((await jsonRequest(url, "/api/bookmarks", { token: OWNER_TOKEN })).data.length, 1);
});

test("POST with the same id updates an existing bookmark", async (t) => {
  const { url } = await startTestApi(t);
  await jsonRequest(url, "/api/bookmarks", { method: "POST", token: OWNER_TOKEN, body: example() });
  const updated = await jsonRequest(url, "/api/bookmarks", {
    method: "POST", token: OWNER_TOKEN, body: { ...example(), title: "Edited title", note: "Edited note" },
  });
  assert.equal(updated.response.status, 201);
  const bookmarks = (await jsonRequest(url, "/api/bookmarks", { token: OWNER_TOKEN })).data;
  assert.equal(bookmarks.length, 1);
  assert.equal(bookmarks[0].title, "Edited title");
  assert.equal(bookmarks[0].note, "Edited note");
});

test("POST validates URL, title and tags", async (t) => {
  const { url } = await startTestApi(t);
  for (const body of [
    { ...example(), url: "javascript:alert(1)" },
    { ...example(), url: "not-a-url" },
    { ...example(), title: "   " },
    { ...example(), tags: "not an array" },
    { ...example(), createdAt: "not-a-number" },
  ]) {
    const { response, data } = await jsonRequest(url, "/api/bookmarks", {
      method: "POST", token: OWNER_TOKEN, body,
    });
    assert.equal(response.status, 400);
    assert.ok(data.error);
  }
  assert.deepEqual((await jsonRequest(url, "/api/bookmarks", { token: OWNER_TOKEN })).data, []);
});

test("POST with malformed JSON returns 400", async (t) => {
  const { url } = await startTestApi(t);
  const response = await fetch(url + "/api/bookmarks", {
    method: "POST", headers: { Authorization: OWNER_TOKEN, "Content-Type": "application/json" },
    body: "{broken JSON",
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Invalid JSON/);
});

test("DELETE requires owner and removes only selected bookmark", async (t) => {
  const { url, store } = await startTestApi(t);
  await store.upsert(validateBookmark(example("one")));
  await store.upsert(validateBookmark(example("two")));
  assert.equal((await jsonRequest(url, "/api/bookmarks/one", { method: "DELETE" })).response.status, 401);
  const removed = await jsonRequest(url, "/api/bookmarks/one", { method: "DELETE", token: OWNER_TOKEN });
  assert.equal(removed.response.status, 200);
  assert.deepEqual(removed.data, { deleted: true, id: "one" });
  assert.deepEqual((await jsonRequest(url, "/api/bookmarks", { token: OWNER_TOKEN })).data.map((b) => b.id), ["two"]);
});

test("DELETE returns 404 for an unknown bookmark", async (t) => {
  const { url } = await startTestApi(t);
  assert.equal((await jsonRequest(url, "/api/bookmarks/missing", {
    method: "DELETE", token: OWNER_TOKEN,
  })).response.status, 404);
});

test("unknown API endpoint returns JSON 404", async (t) => {
  const { url } = await startTestApi(t);
  const { response, data } = await jsonRequest(url, "/api/not-real");
  assert.equal(response.status, 404);
  assert.equal(data.error, "Not found");
});

test("OPTIONS preflight returns CORS headers for allowed local origin", async (t) => {
  const { url } = await startTestApi(t);
  const response = await fetch(url + "/api/bookmarks", {
    method: "OPTIONS",
    headers: { Origin: "http://localhost:8080", "Access-Control-Request-Method": "POST" },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:8080");
  assert.match(response.headers.get("access-control-allow-methods"), /POST/);
});

test("CORS does not approve unknown origins", async (t) => {
  const { url } = await startTestApi(t);
  const response = await fetch(url + "/api/bookmarks", {
    headers: { Origin: "https://untrusted.example" },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("Share is owner-only, public by token, stable across edits and invalid after delete", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "bookmark-share-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = new JsonBookmarkStore(join(directory, "bookmarks.json"));
  await store.initialize();
  const { url } = await startTestApi(t, store);
  const ownerPost = { method: "POST", token: OWNER_TOKEN };
  const route = "/api/bookmarks/test-1/share";
  const body = example();
  await jsonRequest(url, "/api/bookmarks", { ...ownerPost, body });
  await store.upsert({ ...validateBookmark(example("private")), id: "a".repeat(64) });
  assert.equal((await jsonRequest(url, "/api/shared/" + "a".repeat(64))).response.status, 404);
  assert.equal((await jsonRequest(url, route, { method: "POST" })).response.status, 401);
  assert.equal((await jsonRequest(url, route, { ...ownerPost, token: "Bearer wrong-user" })).response.status, 401);
  assert.equal((await jsonRequest(url, "/api/bookmarks/missing/share", ownerPost)).response.status, 404);
  const [first, second] = await Promise.all([
    jsonRequest(url, route, ownerPost), jsonRequest(url, route, ownerPost),
  ]);
  assert.equal(first.response.status, 200);
  assert.deepEqual(first.data, second.data);
  assert.match(first.data.token, /^[a-f0-9]{64}$/);
  const publicRoute = "/api/shared/" + first.data.token;
  const shared = await jsonRequest(url, publicRoute);
  assert.equal(shared.response.status, 200);
  assert.equal(shared.response.headers.get("cache-control"), "no-store");
  assert.deepEqual(shared.data, {
    title: body.title, description: body.description, cover: body.cover, url: body.url, note: body.note,
  });
  assert.equal((await jsonRequest(url, "/api/shared/invalid")).response.status, 404);
  assert.equal((await jsonRequest(url, publicRoute, { method: "DELETE" })).response.status, 404);
  const collection = await jsonRequest(url, "/api/bookmarks");
  assert.equal(collection.response.status, 200);
  assert.ok(collection.data.some((item) => item.id === "a".repeat(64)));
  assert.ok(collection.data.every((item) => !Object.hasOwn(item, "shareToken")));
  await jsonRequest(url, "/api/bookmarks", { ...ownerPost, body: { ...body, note: "Updated note" } });
  assert.equal((await jsonRequest(url, publicRoute)).data.note, "Updated note");
  assert.deepEqual((await jsonRequest(url, route, ownerPost)).data, first.data);
  await jsonRequest(url, "/api/bookmarks/test-1", { method: "DELETE", token: OWNER_TOKEN });
  assert.equal((await jsonRequest(url, publicRoute)).response.status, 404);
});

test("validateBookmark trims fields and normalizes tags", () => {
  const result = validateBookmark({
    url: " https://example.com/ ", title: " Example ",
    tags: [" tag ", "", "music"], category: " WORK ",
  });
  assert.equal(result.url, "https://example.com/");
  assert.equal(result.title, "Example");
  assert.deepEqual(result.tags, ["tag", "music"]);
  assert.equal(result.category, "WORK");
});
