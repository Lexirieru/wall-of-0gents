import { getDb } from "./db.js";

// Anti-replay ledger. A payment txHash is bound to exactly one (tokenId,
// subscriber) and may be consumed exactly once. The PRIMARY KEY on txHash
// makes the claim atomic — concurrent /x402/infer calls racing on the same
// tx can never both win.

export class PaymentReplayError extends Error {
  constructor(public readonly txHash: string) {
    super("payment already consumed");
  }
}

/**
 * Atomically claim a payment tx for (tokenId, subscriber). Throws
 * PaymentReplayError if this txHash was already consumed (by anyone).
 * Must be called AFTER on-chain validation and BEFORE running inference.
 */
export function consumePayment(
  txHash: `0x${string}`,
  tokenId: bigint,
  subscriber: `0x${string}`,
  amount: bigint,
): void {
  try {
    getDb().run("INSERT INTO consumed_payments VALUES (?,?,?,?,?)", [
      txHash.toLowerCase(),
      tokenId.toString(),
      subscriber.toLowerCase(),
      amount.toString(),
      Date.now(),
    ]);
  } catch (e) {
    if (e instanceof Error && /UNIQUE|constraint/i.test(e.message)) {
      throw new PaymentReplayError(txHash);
    }
    throw e;
  }
}

export function isPaymentConsumed(txHash: string): boolean {
  const row = getDb()
    .query("SELECT 1 FROM consumed_payments WHERE txHash=?")
    .get(txHash.toLowerCase());
  return row != null;
}
