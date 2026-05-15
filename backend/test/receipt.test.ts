import "./env.ts";
import { test, expect } from "bun:test";
import { createHash } from "node:crypto";
import { recoverMessageAddress } from "viem";
import { buildReceipt } from "../src/compute/receipt.js";

function digest(fields: Record<string, string>): string {
  const payload = Object.entries(fields)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("|");
  return createHash("sha256").update(payload).digest("hex");
}

test("receipt v4 binds prompt/tx/chain and is ECDSA-recoverable to operator", async () => {
  const r = await buildReceipt({
    callId: "call-1",
    tokenId: 7n,
    subscriber: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    prompt: "what is 2+2?",
    output: "hello",
    txHash: "0xABCDEF" + "0".repeat(58),
    bundleHashBefore: "b0",
    bundleHashAfter: "b1",
  });

  expect(r.version).toBe(4);
  expect(r.signatureType).toBe("eip191");
  expect(r.chainId).toBe(16602);
  expect(r.operator.toLowerCase()).toBe(process.env.OPERATOR_ADDRESS!.toLowerCase());
  // prompt + output are bound by hash
  expect(r.promptHash).toBe(createHash("sha256").update("what is 2+2?").digest("hex"));
  expect(r.outputHash).toBe(createHash("sha256").update("hello").digest("hex"));
  // txHash is normalized lowercase
  expect(r.txHash).toBe(("0xABCDEF" + "0".repeat(58)).toLowerCase());

  const d = digest({
    callId: r.callId,
    tokenId: r.tokenId,
    subscriber: r.subscriber,
    promptHash: r.promptHash,
    outputHash: r.outputHash,
    bundleHashBefore: r.bundleHashBefore,
    bundleHashAfter: r.bundleHashAfter,
    txHash: r.txHash,
    chainId: r.chainId.toString(),
    agentNft: r.agentNft,
    timestamp: r.timestamp.toString(),
  });

  const recovered = await recoverMessageAddress({
    message: d,
    signature: r.signature as `0x${string}`,
  });
  expect(recovered.toLowerCase()).toBe(r.operator.toLowerCase());
});
