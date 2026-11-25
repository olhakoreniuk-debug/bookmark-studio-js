import { readFile, rename, writeFile } from "node:fs/promises";
import { config } from "./config.js";

export class JsonBookmarkStore {
  #pending = Promise.resolve();

  #mutate(operation) {
    const result = this.#pending.then(operation);
    this.#pending = result.catch(() => {});
    return result;
  }

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
    return (await this.#read()).sort((a, b) => b.createdAt - a.createdAt)
      .map(({ shareToken, ...bookmark }) => bookmark);
  }

  async upsert(bookmark) {
    return this.#mutate(async () => {
      const bookmarks = await this.#read();
      const index = bookmarks.findIndex((item) => item.id === bookmark.id);
      if (index === -1) bookmarks.push(bookmark);
      else bookmarks[index] = { ...bookmark, shareToken: bookmarks[index].shareToken };
      await this.#write(bookmarks);
      return bookmark;
    });
  }

  async delete(id) {
    return this.#mutate(async () => {
      const bookmarks = await this.#read();
      const remaining = bookmarks.filter((item) => item.id !== id);
      if (remaining.length === bookmarks.length) return false;
      await this.#write(remaining);
      return true;
    });
  }

  async share(id, candidate) {
    return this.#mutate(async () => {
      const bookmarks = await this.#read();
      const bookmark = bookmarks.find((item) => item.id === id);
      if (!bookmark || bookmark.shareToken) return bookmark?.shareToken;
      if (bookmarks.some((item) => item.shareToken === candidate)) throw new Error("Duplicate share token");
      bookmark.shareToken = candidate;
      await this.#write(bookmarks);
      return candidate;
    });
  }

  async findShared(token) {
    return (await this.#read()).find((item) => item.shareToken === token);
  }

  async health() {
    await this.#read();
  }
}
