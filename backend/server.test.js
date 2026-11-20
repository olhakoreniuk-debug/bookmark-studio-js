import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { JsonBookmarkStore } from "./json-store.js";
import { validateBookmark } from "./validation.js";

test("creates, lists and updates without duplicates", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "bookmark-studio-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const store = new JsonBookmarkStore(path.join(directory, "bookmarks.json"));
  await store.initialize();
  const bookmark = validateBookmark({ id: "saved-bookmark", url: "https://example.com/article",
    title: "First title", description: "Description", note: "Private note",
    tags: ["test", "api"], createdAt: 1700000000000 });
  await store.upsert(bookmark);
  await store.upsert({ ...bookmark, title: "Updated title" });
  const bookmarks = await store.list();
  assert.equal(bookmarks.length, 1);
  assert.equal(bookmarks[0].title, "Updated title");
  assert.deepEqual(bookmarks[0].tags, ["test", "api"]);
});

test("deletes an existing bookmark", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "bookmark-studio-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const store = new JsonBookmarkStore(path.join(directory, "bookmarks.json"));
  await store.initialize();
  await store.upsert(validateBookmark({ id: "one", url: "https://example.com", title: "One" }));
  assert.equal(await store.delete("one"), true);
  assert.equal(await store.delete("one"), false);
  assert.deepEqual(await store.list(), []);
});

test("rejects an invalid URL and missing title", () => {
  assert.throws(() => validateBookmark({ url: "not-a-url", title: "Title" }), /complete URL/);
  assert.throws(() => validateBookmark({ url: "https://example.com", title: "" }), /title is required/);
});
