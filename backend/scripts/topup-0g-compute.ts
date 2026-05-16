/**
 * Top up operator's 0G Compute inference balance.
 *
 * The broker holds a per-provider inference balance in OG tokens.
 * Each /infer call deducts from this balance. Run this script periodically
 * to refill so agents don't fail with "insufficient balance".
 *
 * Usage:
 *   set -a && . ./.env && set +a
 *   bun run scripts/topup-0g-compute.ts [amount_in_og]
 *
 * Example: bun run scripts/topup-0g-compute.ts 1.5
 * (deposits 1.5 OG to the provider's inference balance)
 */

import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0gfoundation/0g-compute-ts-sdk";

const AMOUNT_OG = process.argv[2] ?? "1";
const RPC_URL = process.env.ZG_COMPUTE_RPC_URL ?? "https://evmrpc.0g.ai";
const OPERATOR_KEY = process.env.OPERATOR_PRIVATE_KEY;
const PROVIDER_ADDR = process.env.ZG_COMPUTE_PROVIDER_ADDRESS ?? "0x69Eb5a0BD7d0f4bF39eD5CE9Bd3376c61863aE08";

if (!OPERATOR_KEY) {
  console.error("OPERATOR_PRIVATE_KEY not set");
  process.exit(1);
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(OPERATOR_KEY!, provider);
  console.log(`[topup] wallet: ${wallet.address}`);

  const bal = await provider.getBalance(wallet.address);
  console.log(`[topup] OG balance: ${ethers.formatEther(bal)} OG`);

  const broker = await createZGComputeNetworkBroker(wallet);
  const amountWei = ethers.parseEther(AMOUNT_OG);

  console.log(`[topup] provider: ${PROVIDER_ADDR}`);
  console.log(`[topup] depositing ${AMOUNT_OG} OG to inference balance...`);

  await broker.ledger.transferFund(PROVIDER_ADDR as `0x${string}`, "inference", amountWei);
  console.log(`[topup] done. Provider inference balance topped up by ${AMOUNT_OG} OG`);
}

main().catch(e => { console.error("[topup] fatal:", e); process.exit(1); });
