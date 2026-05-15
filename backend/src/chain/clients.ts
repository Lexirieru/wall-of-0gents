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

export const baseSepoliaChain = {
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [cfg.BASE_RPC_URL] } },
} as const;

export const zgPublic = createPublicClient({ chain: zgChain, transport: http(cfg.ZG_RPC_URL) });
export const basePublic = createPublicClient({ chain: baseSepoliaChain, transport: http(cfg.BASE_RPC_URL) });

export const operatorAccount = privateKeyToAccount(cfg.OPERATOR_PRIVATE_KEY as `0x${string}`);

export const zgWallet = createWalletClient({
  account: operatorAccount,
  chain: zgChain,
  transport: http(cfg.ZG_RPC_URL),
});

// Cache: tokenId → { shareToken, vaultBase, operator }
const agentInfoCache = new Map<bigint, { shareToken: `0x${string}`; vaultBase: `0x${string}`; operator: `0x${string}` }>();

export async function getAgentInfo(tokenId: bigint) {
  if (agentInfoCache.has(tokenId)) return agentInfoCache.get(tokenId)!;

  const info = await zgPublic.readContract({
    address: cfg.WALL_REGISTRY as `0x${string}`,
    abi: wallRegistryAbi,
    functionName: "info",
    args: [tokenId],
  });

  const result = { shareToken: info.shareToken, vaultBase: info.vaultBase, operator: info.operator };
  agentInfoCache.set(tokenId, result);
  return result;
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
