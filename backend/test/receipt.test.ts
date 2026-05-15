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

test("receipt signature is real ECDSA recoverable to the operator", async () => {
  const r = await buildReceipt({
    callId: "call-1",
    tokenId: 7n,
    subscriber: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    output: "hello",
    bundleHashBefore: "b0",
    bundleHashAfter: "b1",
  });

  expect(r.version).toBe(3);
  expect(r.signatureType).toBe("eip191");
  expect(r.operator.toLowerCase()).toBe(process.env.OPERATOR_ADDRESS!.toLowerCase());

  const d = digest({
    callId: r.callId,
    tokenId: r.tokenId,
    subscriber: r.subscriber,
    outputHash: r.outputHash,
    bundleHashBefore: r.bundleHashBefore,
    bundleHashAfter: r.bundleHashAfter,
    timestamp: r.timestamp.toString(),
  });

  const recovered = await recoverMessageAddress({
    message: d,
    signature: r.signature as `0x${string}`,
  });
  expect(recovered.toLowerCase()).toBe(r.operator.toLowerCase());

  // outputHash binds the response
  expect(r.outputHash).toBe(createHash("sha256").update("hello").digest("hex"));
});
