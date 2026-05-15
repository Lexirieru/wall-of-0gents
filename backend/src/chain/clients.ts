import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { cfg } from "../config.js";
import { wallAgentNftAbi, wallRegistryAbi, wallFractionalizerAbi } from "./abis.js";

export const zgChain = {
  id: 16602,
  name: "0G Galileo",
  nativeCurrency: { name: "A0GI", symbol: "A0GI", decimals: 18 },
  rpcUrls: { default: { http: [cfg.ZG_RPC_URL] } },
} as const;

export const zgPublic = createPublicClient({ chain: zgChain, transport: http(cfg.ZG_RPC_URL) });

export const operatorAccount = privateKeyToAccount(cfg.OPERATOR_PRIVATE_KEY as `0x${string}`);

// L1: receipts are signed by a (optionally) separate low-privilege key so a
// compromised node can't forge receipts AND act as the on-chain operator/owner.
export const receiptSigner = cfg.RECEIPT_SIGNER_PRIVATE_KEY
  ? privateKeyToAccount(cfg.RECEIPT_SIGNER_PRIVATE_KEY as `0x${string}`)
  : operatorAccount;

export const zgWallet = createWalletClient({
  account: operatorAccount,
  chain: zgChain,
  transport: http(cfg.ZG_RPC_URL),
});

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

type AgentInfo = { shareToken: `0x${string}`; vaultBase: `0x${string}`; operator: `0x${string}` };

// TTL cache: tokenId → { value, expiresAt }. Two integration-critical rules:
//  1. Entries expire (so on-chain changes are picked up without a restart).
//  2. "Not registered yet" results (operator == 0x0) are NEVER cached, so the
//     backend keeps re-checking until the agent is registered on-chain — then
//     starts serving the real vault. Without this, a single early read would
//     pin vaultBase=0x0 forever and x402 would route to the market fallback
//     even after on-chain registration.
const agentInfoCache = new Map<bigint, { value: AgentInfo; expiresAt: number }>();

export async function getAgentInfo(tokenId: bigint): Promise<AgentInfo> {
  const hit = agentInfoCache.get(tokenId);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const info = await zgPublic.readContract({
    address: cfg.WALL_REGISTRY as `0x${string}`,
    abi: wallRegistryAbi,
    functionName: "info",
    args: [tokenId],
  });

  const result: AgentInfo = {
    shareToken: info.shareToken,
    vaultBase: info.vaultBase,
    operator: info.operator,
  };

  // Only cache once the agent is actually registered on-chain.
  if (result.operator !== ZERO_ADDR) {
    agentInfoCache.set(tokenId, {
      value: result,
      expiresAt: Date.now() + cfg.AGENT_INFO_CACHE_TTL_MS,
    });
  } else {
    agentInfoCache.delete(tokenId);
  }
  return result;
}

/** Drop a cached entry (e.g. after observing an on-chain registration). */
export function invalidateAgentInfo(tokenId: bigint): void {
  agentInfoCache.delete(tokenId);
}

export async function getAgentOwner(tokenId: bigint): Promise<`0x${string}`> {
  return zgPublic.readContract({
    address: cfg.WALL_AGENT_NFT as `0x${string}`,
    abi: wallAgentNftAbi,
    functionName: "ownerOf",
    args: [tokenId],
  });
}

export async function isAuthorized(tokenId: bigint, subscriber: `0x${string}`): Promise<boolean> {
  return zgPublic.readContract({
    address: cfg.WALL_AGENT_NFT as `0x${string}`,
    abi: wallAgentNftAbi,
    functionName: "isAuthorized",
    args: [tokenId, subscriber],
  });
}

// Relay the usage grant through WallFractionalizer (INT-1): post-launch the
// fractionalizer OWNS the iNFT, so calling WallAgentNFT.authorizeUsage directly
// from the operator reverts NotOwnerOrApproved. The fractionalizer's
// authorizeUsageFor (restricted to the operator) relays it as the owner.
export async function authorizeUsage(tokenId: bigint, grantee: `0x${string}`, expiresAt: bigint) {
  return zgWallet.writeContract({
    address: cfg.WALL_FRACTIONALIZER as `0x${string}`,
    abi: wallFractionalizerAbi,
    functionName: "authorizeUsageFor",
    args: [tokenId, grantee, expiresAt],
  });
}

/**
 * Verify `signature` over `message` was produced by `claimedOwner`, AND that
 * `claimedOwner` is authorized to manage this agent — i.e. either the current
 * iNFT owner OR the registered operator (the original creator).
 *
 * The operator check is essential post-launch: once an agent is launched the
 * iNFT is held by the WallFractionalizer, so `ownerOf` is no longer the
 * creator. WallRegistry preserves the original `operator`, which is who
 * legitimately controls the off-chain agent persona. Supports EOAs and
 * ERC-1271 smart accounts via on-chain verifyMessage.
 */
export async function verifyAgentOwner(
  tokenId: bigint,
  claimedOwner: `0x${string}`,
  message: string,
  signature: `0x${string}`,
): Promise<boolean> {
  const claimed = claimedOwner.toLowerCase();

  const [ownerRes, infoRes] = await Promise.allSettled([
    getAgentOwner(tokenId),
    getAgentInfo(tokenId),
  ]);

  const isCurrentOwner =
    ownerRes.status === "fulfilled" && ownerRes.value.toLowerCase() === claimed;
  const isRegisteredOperator =
    infoRes.status === "fulfilled" &&
    infoRes.value.operator !== "0x0000000000000000000000000000000000000000" &&
    infoRes.value.operator.toLowerCase() === claimed;

  if (!isCurrentOwner && !isRegisteredOperator) return false;

  try {
    return await zgPublic.verifyMessage({ address: claimedOwner, message, signature });
  } catch {
    return false;
  }
}
