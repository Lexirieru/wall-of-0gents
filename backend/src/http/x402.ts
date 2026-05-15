import { parseAbiItem, decodeEventLog } from "viem";
import { basePublic } from "../chain/clients.js";
import { erc20Abi } from "../chain/abis.js";
import { cfg } from "../config.js";

export interface X402Receipt {
  txHash: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
  blockNumber: bigint;
}

export class X402Error extends Error {
  constructor(
    public readonly code:
      | "NO_RECEIPT"
      | "INVALID_RECEIPT"
      | "WRONG_RECIPIENT"
      | "WRONG_SENDER"
      | "AMOUNT_TOO_LOW"
      | "UNCONFIRMED",
    message: string,
  ) {
    super(message);
  }
}

// Returns 402 challenge body
export function makeChallenge(vaultAddress: string, minAmountUsdc: bigint) {
  return {
    scheme: "x402",
    network: "base-sepolia",
    asset: cfg.USDC_BASE,
    recipient: vaultAddress,
    minAmount: minAmountUsdc.toString(),
    memo: "Wall of 0gents inference payment",
  };
}

// Validates a USDC Transfer on Base Sepolia.
// `expectedSender` binds the payment to the subscriber so a tx that paid the
// vault for someone else cannot be replayed under a different subscriber.
export async function validateReceipt(
  txHash: `0x${string}`,
  expectedRecipient: `0x${string}`,
  minAmount: bigint,
  expectedSender: `0x${string}`,
): Promise<X402Receipt> {
  const receipt = await basePublic.getTransactionReceipt({ hash: txHash }).catch(() => null);
  if (!receipt) throw new X402Error("INVALID_RECEIPT", "tx not found");

  if (receipt.status !== "success") throw new X402Error("INVALID_RECEIPT", "tx failed");

  const minConf = BigInt(cfg.X402_MIN_CONFIRMATIONS);
  const head = await basePublic.getBlockNumber();
  const confirmations = head - receipt.blockNumber;
  if (confirmations < minConf)
    throw new X402Error("UNCONFIRMED", `need ${cfg.X402_MIN_CONFIRMATIONS} confirmations, have ${confirmations}`);

  // Find USDC Transfer log from expectedSender to expectedRecipient
  parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

  let sawRecipientTransfer = false;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== cfg.USDC_BASE.toLowerCase()) continue;
    let decoded;
    try {
      decoded = decodeEventLog({ abi: erc20Abi, data: log.data, topics: log.topics });
    } catch {
      continue;
    }
    if (decoded.eventName !== "Transfer") continue;
    const { from, to, value } = decoded.args as { from: `0x${string}`; to: `0x${string}`; value: bigint };
    if (to.toLowerCase() !== expectedRecipient.toLowerCase()) continue;
    sawRecipientTransfer = true;
    if (from.toLowerCase() !== expectedSender.toLowerCase()) continue;
    if (value < minAmount) continue;
    return { txHash, from, to, amount: value, blockNumber: receipt.blockNumber };
  }

  if (sawRecipientTransfer)
    throw new X402Error(
      "WRONG_SENDER",
      "no USDC transfer from subscriber to vault with sufficient amount found",
    );
  throw new X402Error("WRONG_RECIPIENT", "no USDC transfer to expected recipient found");
}
