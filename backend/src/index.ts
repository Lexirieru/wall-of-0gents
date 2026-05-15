import { cfg } from "./config.js";
import { log } from "./log.js";
import { createServer, recoverPendingCalls } from "./http/server.js";
import { dynamicRegistry } from "./store/dynamic-registry.js";
import { closeDb } from "./store/db.js";
import { operatorAccount } from "./chain/clients.js";

async function main() {
  log.info("starting Wall of 0gents operator node", {
    operator: operatorAccount.address,
    httpPort: cfg.HTTP_PORT,
    compute: `${cfg.COMPUTE_BACKEND} @ ${cfg.COMPUTE_BASE_URL}`,
  });

  await dynamicRegistry.init();
  await recoverPendingCalls();

  const server = createServer();
  log.info("listening", { url: `http://localhost:${cfg.HTTP_PORT}` });

  let shuttingDown = false;
  const shutdown = (sig: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.warn("shutting down", { signal: sig });
    server.stop(true); // stop accepting, let in-flight finish
    closeDb();
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((e) => {
  log.error("fatal", { err: e instanceof Error ? e.stack ?? e.message : String(e) });
  process.exit(1);
});
