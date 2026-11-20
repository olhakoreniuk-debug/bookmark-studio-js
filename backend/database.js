import { config } from "./config.js";
import { JsonBookmarkStore } from "./json-store.js";
import { PostgresBookmarkStore } from "./postgres.js";

// Create one pool per backend process. The pool reuses connections between queries.
export async function createStore() {
  if (!config.databaseUrl) return new JsonBookmarkStore();
  const { Pool } = await import("pg");
  return new PostgresBookmarkStore(new Pool({ connectionString: config.databaseUrl }));
}
