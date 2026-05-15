import { createHmac, randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { cfg } from "../config.js";

export interface InferenceReceipt {
  version: 2;
  callId: string;
  tokenId: string;
  subscriber: string;
  outputHash: string;
  bundleHashBefore: string;
  bundleHashAfter: string;
  timestamp: number;
  signature: string;
}

function digest(fields: Record<string, string>): string {
  const payload = Object.entries(fields)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("|");
  return createHash("sha256").update(payload).digest("hex");
}

function sign(d: string): string {
  return createHmac("sha256", cfg.OPERATOR_PRIVATE_KEY).update(d).digest("hex");
}

export function buildReceipt(params: {
  callId: string;
  tokenId: bigint;
  subscriber: `0x${string}`;
  output: string;
  bundleHashBefore: string;
  bundleHashAfter: string;
}): InferenceReceipt {
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
  const signature = sign(d);

  return { version: 2, ...fields, signature };
}
