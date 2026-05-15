import { dynamicRegistry } from "../store/dynamic-registry.js";

// Static fallback prices in USDC (6 decimals).
const STATIC_PRICES: Record<string, bigint> = {
  "1": 1_000_000n, // $1.00 — WAGNT
};

const DEFAULT_PRICE = 500_000n; // $0.50

function parsePrice(raw: string | undefined): bigint | null {
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return null;
  const v = BigInt(raw);
  // Reject zero / absurd values so a bad registry entry can't make inference free.
  if (v <= 0n) return null;
  return v;
}

/**
 * Resolve price for a token. The agent owner's registered `priceUsdc` wins
 * (this is what makes per-agent pricing actually work); otherwise fall back
 * to the static table, then the global default.
 */
export function priceFor(tokenId: bigint): bigint {
  const entry = dynamicRegistry.get(tokenId);
  const fromRegistry = parsePrice(entry?.priceUsdc);
  if (fromRegistry != null) return fromRegistry;
  return STATIC_PRICES[tokenId.toString()] ?? DEFAULT_PRICE;
}
