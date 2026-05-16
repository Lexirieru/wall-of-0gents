import { dynamicRegistry } from "../store/dynamic-registry.js";

// Static fallback prices in USDC (6 decimals).
const STATIC_PRICES: Record<string, bigint> = {
  "1": 1_000_000n, // $1.00 — WAGNT
};

const DEFAULT_PRICE = 400n; // $0.0004
export const MIN_PRICE = 400n; // $0.0004 — floor enforced at register + runtime

function parsePrice(raw: string | undefined): bigint | null {
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return null;
  const v = BigInt(raw);
  if (v < MIN_PRICE) return null;
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
