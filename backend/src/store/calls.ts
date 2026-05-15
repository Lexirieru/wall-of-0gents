import { getDb } from "./db.js";

export type CallStatus = "pending" | "done" | "error";

export interface CallRow {
  callId: string;
  txHash: string | null;
  tokenId: string;
  subscriber: string;
  prompt: string;
  status: CallStatus;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Persist a paid call as `pending` BEFORE inference runs. If the process dies
 * mid-inference (after the payment was already consumed), boot recovery can
 * find this row and re-run — the user never loses a paid call.
 */
export function createPendingCall(p: {
  callId: string;
  txHash: string | null;
  tokenId: bigint;
  subscriber: string;
  prompt: string;
}): void {
  const now = Date.now();
  getDb().run(
    "INSERT OR REPLACE INTO calls (callId,txHash,tokenId,subscriber,prompt,status,error,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)",
    [p.callId, p.txHash, p.tokenId.toString(), p.subscriber.toLowerCase(), p.prompt, "pending", null, now, now],
  );
}

export function markCallDone(callId: string): void {
  getDb().run("UPDATE calls SET status='done', error=NULL, updatedAt=? WHERE callId=?", [
    Date.now(),
    callId,
  ]);
}

export function markCallError(callId: string, error: string): void {
  getDb().run("UPDATE calls SET status='error', error=?, updatedAt=? WHERE callId=?", [
    error,
    Date.now(),
    callId,
  ]);
}

export function getCall(callId: string): CallRow | null {
  return (getDb().query("SELECT * FROM calls WHERE callId=?").get(callId) as CallRow | null) ?? null;
}

export function listPendingCalls(): CallRow[] {
  return getDb()
    .query("SELECT * FROM calls WHERE status='pending' ORDER BY createdAt ASC")
    .all() as CallRow[];
}
