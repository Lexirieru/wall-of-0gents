// Per-tokenId pricing in USDC (6 decimals)
const STATIC_PRICES: Record<string, bigint> = {
  "1": 1_000_000n, // $1.00 — WAGNT
};

const DEFAULT_PRICE = 500_000n; // $0.50

export function priceFor(tokenId: bigint): bigint {
  return STATIC_PRICES[tokenId.toString()] ?? DEFAULT_PRICE;
}
