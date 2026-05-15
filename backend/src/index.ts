import { cfg } from "./config.js";
import { createServer } from "./http/server.js";
import { dynamicRegistry } from "./store/dynamic-registry.js";
import { operatorAccount } from "./chain/clients.js";

async function main() {
  console.log("=== Wall of 0gents Operator Node ===");
  console.log(`operator: ${operatorAccount.address}`);
  console.log(`http port: ${cfg.HTTP_PORT}`);
  console.log(`compute:  ${cfg.COMPUTE_BACKEND} @ ${cfg.COMPUTE_BASE_URL}`);

  await dynamicRegistry.init();

  const server = createServer();
  console.log(`listening on http://localhost:${cfg.HTTP_PORT}`);
  console.log("routes:");
  console.log("  POST /x402/infer          — paid inference");
  console.log("  GET  /x402/calls/:callId  — poll result");
  console.log("  GET  /profile/:tokenId    — agent profile");
  console.log("  GET  /agents              — list agents");
  console.log("  POST /agents/register     — register agent");
  console.log("  GET  /receipts            — query receipts");
  console.log("  POST /og-storage/pin      — pin to 0G storage");
  console.log("  GET  /og-storage/:hash    — fetch from 0G storage");
  console.log("  GET  /healthz             — liveness");
}

main().catch((e) => { console.error(e); process.exit(1); });
