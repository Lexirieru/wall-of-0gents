import { parseAbiItem, decodeEventLog } from "viem";
import { zgPublic } from "../chain/clients.js";
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
    network: "0g-galileo",
    chainId: 16602,
    asset: cfg.PAYMENT_ASSET,
    recipient: vaultAddress,
    minAmount: minAmountUsdc.toString(),
    memo: "Wall of 0gents inference payment",
  };
}

// Validates a PAYMENT_ASSET (ERC-20) Transfer on 0G Galileo.
// `expectedSender` binds the payment to the subscriber so a tx that paid the
// vault for someone else cannot be replayed under a different subscriber.
export async function validateReceipt(
  txHash: `0x${string}`,
  expectedRecipient: `0x${string}`,
  minAmount: bigint,
  expectedSender: `0x${string}`,
): Promise<X402Receipt> {
  const receipt = await zgPublic.getTransactionReceipt({ hash: txHash }).catch(() => null);
  if (!receipt) throw new X402Error("INVALID_RECEIPT", "tx not found");

  if (receipt.status !== "success") throw new X402Error("INVALID_RECEIPT", "tx failed");

  // Reorg protection: only enforce min-confirmations once the RPC head has
  // actually advanced past the tx's block. If the head is behind the tx block
  // it's RPC sync lag (the tx already has a receipt = it is mined), so we
  // don't false-reject — but when the head IS ahead we require the gap.
  const minConf = BigInt(cfg.X402_MIN_CONFIRMATIONS);
  const head = await zgPublic.getBlockNumber();
  if (head >= receipt.blockNumber) {
    const confirmations = head - receipt.blockNumber;
    if (confirmations < minConf)
      throw new X402Error(
        "UNCONFIRMED",
        `need ${cfg.X402_MIN_CONFIRMATIONS} confirmations, have ${confirmations}`,
      );
  }

  // Find MockUSDC Transfer log from expectedSender to expectedRecipient
  parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

  let sawRecipientTransfer = false;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== cfg.PAYMENT_ASSET.toLowerCase()) continue;
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
