import assert from "node:assert/strict";
import test from "node:test";
import { PostgresBookmarkStore } from "./postgres.js";
import { validateBookmark } from "./validation.js";

test("PostgreSQL share preserves an existing token and reads only public fields", async () => {
  const queries = [];
  const publicFields = { title: "Shared", description: "", cover: "https://example.com/cover.png", url: "https://example.com", note: "Note", tags: ["tech"], category: "TECH" };
  const pool = { async query(sql, values) {
    queries.push({ sql, values });
    return { rows: sql.startsWith("UPDATE") ? [{ share_token: "existing" }] : [publicFields] };
  } };
  const store = new PostgresBookmarkStore(pool);
  assert.equal(await store.share("bookmark-id", "candidate"), "existing");
  assert.match(queries[0].sql, /COALESCE\(share_token, \$2\)/);
  assert.deepEqual(queries[0].values, ["bookmark-id", "candidate"]);
  assert.deepEqual(await store.findShared("existing"), publicFields);
  assert.match(queries[1].sql, /SELECT title, description, cover, url, note, tags, category FROM/);
  assert.deepEqual(queries[1].values, ["existing"]);
});

test("PostgreSQL initialization creates the dedicated bookmarks_js table", async () => {
  const executed = [];
  const pool = { async query(sql) { executed.push(sql); return { rows: [], rowCount: 0 }; } };
  const store = new PostgresBookmarkStore(pool);
  await store.initialize();
  assert.equal(executed.length, 2);
  assert.match(executed[0], /CREATE TABLE IF NOT EXISTS bookmarks_js/i);
  assert.match(executed[0], /tags JSONB/i);
  assert.match(executed[1], /ALTER TABLE bookmarks_js ADD COLUMN IF NOT EXISTS category/i);
});

test("PostgreSQL reads records with correct JSON tags and timestamps", async () => {
  const pool = { async query(sql) {
    assert.match(sql, /FROM bookmarks_js ORDER BY created_at DESC/);
    return { rows: [{
      id: "saved", url: "https://example.com", title: "Saved",
      description: "Description", cover: "", note: "Note",
      tags: ["one", "two"], created_at: "1700000000000", category: "TECH",
    }] };
  } };
  const data = await new PostgresBookmarkStore(pool).list();
  assert.equal(data.length, 1);
  assert.equal(data[0].createdAt, 1700000000000);
  assert.deepEqual(data[0].tags, ["one", "two"]);
  assert.equal(data[0].example, false);
});

test("PostgreSQL upsert uses parameterized SQL and serializes tags", async () => {
  const executed = [];
  const pool = { async query(sql, params) { executed.push({ sql, params }); return { rowCount: 1 }; } };
  const store = new PostgresBookmarkStore(pool);
  const bookmark = validateBookmark({ id: "one", url: "https://example.com", title: "Hello",
    tags: ["work", "tech"], category: "WORK", createdAt: 1700000000000 });
  const result = await store.upsert(bookmark);
  assert.deepEqual(result, bookmark);
  assert.equal(executed.length, 1);
  assert.match(executed[0].sql, /INSERT INTO bookmarks_js/);
  assert.match(executed[0].sql, /ON CONFLICT \(id\) DO UPDATE/);
  assert.match(executed[0].sql, /\$7::jsonb/);
  assert.equal(executed[0].params[6], '["work","tech"]');
  assert.equal(executed[0].params[8], "WORK");
});

test("PostgreSQL DELETE is parameterized and reports whether a row existed", async () => {
  const pool = { async query(sql, params) {
    assert.match(sql, /^DELETE FROM bookmarks_js WHERE id = \$1$/);
    assert.equal(params.length, 1);
    return { rowCount: params[0] === "exists" ? 1 : 0 };
  } };
  const store = new PostgresBookmarkStore(pool);
  assert.equal(await store.delete("exists"), true);
  assert.equal(await store.delete("missing"), false);
});

test("PostgreSQL health executes a simple read-only query", async () => {
  const pool = { async query(sql) {
    assert.equal(sql, "SELECT 1");
    return { rows: [{ "?column?": 1 }] };
  } };
  await new PostgresBookmarkStore(pool).health();
});
