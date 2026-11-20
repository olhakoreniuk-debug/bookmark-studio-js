import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createApp } from "./api.js";
import { config } from "./config.js";
import { createStore } from "./database.js";
import { createTokenVerifier } from "./token.js";

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
