import { cfg } from "./config.js";
import { log } from "./log.js";
import { createServer, recoverPendingCalls } from "./http/server.js";
import { dynamicRegistry } from "./store/dynamic-registry.js";
import { closeDb } from "./store/db.js";
import { operatorAccount, receiptSigner } from "./chain/clients.js";

const TESTNET_MOCK_USDC = "0x0d837ad954f4f9f06e303a86150ad0f322ec5eb1";

// Loud production-readiness rails. None of these are fatal on testnet, but a
// mainnet deployment must clear all of them.
function productionGuards() {
  if (cfg.PAYMENT_ASSET.toLowerCase() === TESTNET_MOCK_USDC)
    log.warn("PROD-GUARD: PAYMENT_ASSET is the testnet MockUSDC (permissionless mint). Set real USDC for mainnet.");
  if (receiptSigner.address.toLowerCase() === operatorAccount.address.toLowerCase())
    log.warn("PROD-GUARD: receipt signer == operator key (L1). Set RECEIPT_SIGNER_PRIVATE_KEY to a separate low-priv key for mainnet.");
  if (cfg.CORS_ORIGINS.trim() === "*")
    log.warn("PROD-GUARD: CORS is wildcard '*'. Set CORS_ORIGINS to an allowlist for mainnet.");
  if (cfg.X402_MIN_CONFIRMATIONS < 3)
    log.warn(`PROD-GUARD: X402_MIN_CONFIRMATIONS=${cfg.X402_MIN_CONFIRMATIONS} (reorg risk). Use >=3 for mainnet value.`);
  // Chain/asset coherence — catches "deployed to mainnet but still pointing at
  // testnet RPC/asset" (and vice-versa) which would silently misroute payments.
  const onMainnet = cfg.ZG_CHAIN_ID === 16661;
  if (onMainnet && cfg.ZG_RPC_URL.includes("testnet"))
    log.warn("PROD-GUARD: ZG_CHAIN_ID=16661 (mainnet) but ZG_RPC_URL is a testnet endpoint.");
  if (onMainnet && cfg.PAYMENT_ASSET.toLowerCase() === TESTNET_MOCK_USDC)
    log.warn("PROD-GUARD: mainnet chain with testnet MockUSDC as PAYMENT_ASSET — set 0G mainnet USDC.e.");
  if (!onMainnet && cfg.ZG_CHAIN_ID !== 16602)
    log.warn(`PROD-GUARD: ZG_CHAIN_ID=${cfg.ZG_CHAIN_ID} is neither 0G testnet (16602) nor mainnet (16661).`);
  // 0G Compute provider/RPC coherence. The default provider+RPC are the
  // testnet TeeML node; on mainnet they must be repointed or sealed inference
  // will route to (or settle on) the wrong network.
  const TESTNET_COMPUTE_PROVIDER = "0x69eb5a0bd7d0f4bf39ed5ce9bd3376c61863ae08";
  if (onMainnet && cfg.ZG_COMPUTE_PROVIDER_ADDRESS.toLowerCase() === TESTNET_COMPUTE_PROVIDER)
    log.warn("PROD-GUARD: mainnet chain but ZG_COMPUTE_PROVIDER_ADDRESS is the testnet provider. Set the mainnet provider from https://pc.0g.ai (e.g. Qwen3-VL-30B).");
  if (onMainnet && cfg.ZG_COMPUTE_RPC_URL.includes("testnet"))
    log.warn("PROD-GUARD: mainnet chain but ZG_COMPUTE_RPC_URL is a testnet endpoint — set https://evmrpc.0g.ai.");
  if (!onMainnet && !cfg.ZG_COMPUTE_RPC_URL.includes("testnet"))
    log.warn("PROD-GUARD: testnet chain but ZG_COMPUTE_RPC_URL points at mainnet — broker settlement will use mainnet 0G.");
}

async function main() {
  log.info("starting Wall of 0gents operator node", {
    operator: operatorAccount.address,
    httpPort: cfg.HTTP_PORT,
    compute: `${cfg.COMPUTE_BACKEND} @ ${cfg.COMPUTE_BASE_URL}`,
  });
  productionGuards();

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
