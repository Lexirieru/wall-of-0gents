import { getRuntimeFor } from "../runtime/index.js";
import { buildReceipt, type InferenceReceipt } from "./receipt.js";
import { saveReceipt } from "../store/receipts.js";
import { markCallDone, markCallError } from "../store/calls.js";
import { authorizeUsage } from "../chain/clients.js";
import { log } from "../log.js";

export interface CallResult {
  callId: string;
  response: string;
  receipt: InferenceReceipt;
}

/**
 * Run inference for an already-paid call and persist the result. Idempotent:
 * safe to re-run on boot recovery — the receipt is keyed by callId
 * (INSERT OR REPLACE) and the payment was consumed before this ran. Always
 * resolves; failures are recorded as the call's error state.
 */
export async function executeCall(p: {
  callId: string;
  tokenId: bigint;
  subscriber: `0x${string}`;
  prompt: string;
}): Promise<CallResult | { error: string }> {
  try {
    const runtime = getRuntimeFor(p.tokenId);
    const output = await runtime.run({
      tokenId: p.tokenId,
      subscriber: p.subscriber,
      prompt: p.prompt,
    });

    const receipt = await buildReceipt({
      callId: p.callId,
      tokenId: p.tokenId,
      subscriber: p.subscriber,
      output: output.response,
      bundleHashBefore: output.bundleHashBefore,
      bundleHashAfter: output.bundleHashAfter,
    });

    saveReceipt(receipt, output.response);
    markCallDone(p.callId);

    // Best-effort on-chain usage grant (failures logged, never block the result).
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 3600);
    authorizeUsage(p.tokenId, p.subscriber, expiresAt).catch((e) =>
      log.warn("authorizeUsage failed", {
        tokenId: p.tokenId.toString(),
        err: e instanceof Error ? e.message : String(e),
      }),
    );

    return { callId: p.callId, response: output.response, receipt };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    markCallError(p.callId, msg);
    log.error("inference failed", { callId: p.callId, err: msg });
    return { error: msg };
  }
}
