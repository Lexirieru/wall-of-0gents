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
    public readonly code: "NO_RECEIPT" | "INVALID_RECEIPT" | "WRONG_RECIPIENT" | "AMOUNT_TOO_LOW" | "UNCONFIRMED",
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

// Validates a USDC Transfer on Base Sepolia
export async function validateReceipt(
  txHash: `0x${string}`,
  expectedRecipient: `0x${string}`,
  minAmount: bigint,
): Promise<X402Receipt> {
  const receipt = await basePublic.getTransactionReceipt({ hash: txHash }).catch(() => null);
  if (!receipt) throw new X402Error("INVALID_RECEIPT", "tx not found");

  if (receipt.status !== "success") throw new X402Error("INVALID_RECEIPT", "tx failed");

  const confirmations = await basePublic.getBlockNumber().then((n) => n - receipt.blockNumber);
  if (confirmations < cfg.X402_MIN_CONFIRMATIONS)
    throw new X402Error("UNCONFIRMED", `need ${cfg.X402_MIN_CONFIRMATIONS} confirmations`);

  // Find USDC Transfer log to expectedRecipient
  const transferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== cfg.USDC_BASE.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: erc20Abi, data: log.data, topics: log.topics });
      if (decoded.eventName !== "Transfer") continue;
      const { from, to, value } = decoded.args as { from: `0x${string}`; to: `0x${string}`; value: bigint };
      if (to.toLowerCase() !== expectedRecipient.toLowerCase()) continue;
      if (value < minAmount) throw new X402Error("AMOUNT_TOO_LOW", `sent ${value}, need ${minAmount}`);
      return { txHash, from, to, amount: value, blockNumber: receipt.blockNumber };
    } catch (e) {
      if (e instanceof X402Error) throw e;
    }
  }

  throw new X402Error("WRONG_RECIPIENT", "no USDC transfer to expected recipient found");
}
