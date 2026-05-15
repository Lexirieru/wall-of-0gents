import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { cfg } from "../config.js";
import { wallAgentNftAbi, wallRegistryAbi } from "./abis.js";

export const zgChain = {
  id: 16602,
  name: "0G Galileo",
  nativeCurrency: { name: "A0GI", symbol: "A0GI", decimals: 18 },
  rpcUrls: { default: { http: [cfg.ZG_RPC_URL] } },
} as const;

export const zgPublic = createPublicClient({ chain: zgChain, transport: http(cfg.ZG_RPC_URL) });

export const operatorAccount = privateKeyToAccount(cfg.OPERATOR_PRIVATE_KEY as `0x${string}`);

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

export async function authorizeUsage(tokenId: bigint, grantee: `0x${string}`, expiresAt: bigint) {
  return zgWallet.writeContract({
    address: cfg.WALL_AGENT_NFT as `0x${string}`,
    abi: wallAgentNftAbi,
    functionName: "authorizeUsage",
    args: [tokenId, grantee, expiresAt],
  });
}

/**
 * Verify that `signature` over `message` was produced by `claimedOwner`
 * AND that `claimedOwner` currently owns `tokenId`. Supports EOAs and
 * ERC-1271 smart-account owners (via on-chain verifyMessage).
 */
export async function verifyAgentOwner(
  tokenId: bigint,
  claimedOwner: `0x${string}`,
  message: string,
  signature: `0x${string}`,
): Promise<boolean> {
  let onChainOwner: `0x${string}`;
  try {
    onChainOwner = await getAgentOwner(tokenId);
  } catch {
    return false;
  }
  if (onChainOwner.toLowerCase() !== claimedOwner.toLowerCase()) return false;

  try {
    return await zgPublic.verifyMessage({ address: claimedOwner, message, signature });
  } catch {
    return false;
  }
}
