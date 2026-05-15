import { createHash } from "node:crypto";
import { operatorAccount } from "../chain/clients.js";

export interface InferenceReceipt {
  version: 3;
  callId: string;
  tokenId: string;
  subscriber: string;
  outputHash: string;
  bundleHashBefore: string;
  bundleHashAfter: string;
  timestamp: number;
  /** EIP-191 (personal_sign) signature over `digest`, recoverable to `operator`. */
  signature: string;
  /** Operator address that signed the receipt — recover from `digest`+`signature`. */
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
  output: string;
  bundleHashBefore: string;
  bundleHashAfter: string;
}): Promise<InferenceReceipt> {
  const outputHash = createHash("sha256").update(params.output).digest("hex");
  const timestamp = Date.now();

  const fields = {
    callId: params.callId,
    tokenId: params.tokenId.toString(),
    subscriber: params.subscriber.toLowerCase(),
    outputHash,
    bundleHashBefore: params.bundleHashBefore,
    bundleHashAfter: params.bundleHashAfter,
    timestamp: timestamp.toString(),
  };

  const d = digest(fields);
  // Real ECDSA signature tied to the operator's on-chain identity — any third
  // party can recover the signer from (digest, signature) and check it equals
  // `operator`, without needing any shared secret.
  const signature = await operatorAccount.signMessage({ message: d });

  return {
    version: 3,
    callId: fields.callId,
    tokenId: fields.tokenId,
    subscriber: fields.subscriber,
    outputHash: fields.outputHash,
    bundleHashBefore: fields.bundleHashBefore,
    bundleHashAfter: fields.bundleHashAfter,
    timestamp,
    signature,
    operator: operatorAccount.address,
    signatureType: "eip191",
  };
}
