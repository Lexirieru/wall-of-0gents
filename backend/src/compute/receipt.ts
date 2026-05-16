import { createHash } from "node:crypto";
import { receiptSigner } from "../chain/clients.js";
import { cfg } from "../config.js";

const ZG_CHAIN_ID = cfg.ZG_CHAIN_ID;

export interface InferenceReceipt {
  version: 4;
  callId: string;
  tokenId: string;
  subscriber: string;
  /** sha256 of the user prompt — binds the receipt to the request. */
  promptHash: string;
  outputHash: string;
  bundleHashBefore: string;
  bundleHashAfter: string;
  /** Payment tx that funded this call — binds the receipt to settlement. */
  txHash: string;
  /** Deployment binding — prevents cross-chain / cross-deployment replay. */
  chainId: number;
  agentNft: string;
  timestamp: number;
  /** EIP-191 signature over `digest`, recoverable to `operator`. */
  signature: string;
  operator: string;
  signatureType: "eip191";
}

function digest(fields: Record<string, string>): string {
  const payload = Object.entries(fields)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("|");
  return createHash("sha256").update(payload).digest("hex");
}

export async function buildReceipt(params: {
  callId: string;
  tokenId: bigint;
  subscriber: `0x${string}`;
  prompt: string;
  output: string;
  txHash: string;
  bundleHashBefore: string;
  bundleHashAfter: string;
}): Promise<InferenceReceipt> {
  const promptHash = createHash("sha256").update(params.prompt).digest("hex");
  const outputHash = createHash("sha256").update(params.output).digest("hex");
  const timestamp = Date.now();
  const agentNft = cfg.WALL_AGENT_NFT.toLowerCase();

  // The digest binds: who/what (callId,tokenId,subscriber), the prompt, the
  // output, the settlement tx, and the deployment (chainId+contract). A
  // receipt is therefore non-repudiable and not replayable on another
  // deployment or for a different prompt/payment.
  const fields = {
    callId: params.callId,
    tokenId: params.tokenId.toString(),
    subscriber: params.subscriber.toLowerCase(),
    promptHash,
    outputHash,
    bundleHashBefore: params.bundleHashBefore,
    bundleHashAfter: params.bundleHashAfter,
    txHash: params.txHash.toLowerCase(),
    chainId: ZG_CHAIN_ID.toString(),
    agentNft,
    timestamp: timestamp.toString(),
  };

  const d = digest(fields);
  const signature = await receiptSigner.signMessage({ message: d });

  return {
    version: 4,
    callId: fields.callId,
    tokenId: fields.tokenId,
    subscriber: fields.subscriber,
    promptHash,
    outputHash,
    bundleHashBefore: fields.bundleHashBefore,
    bundleHashAfter: fields.bundleHashAfter,
    txHash: fields.txHash,
    chainId: ZG_CHAIN_ID,
    agentNft,
    timestamp,
    signature,
    operator: receiptSigner.address,
    signatureType: "eip191",
  };
}
