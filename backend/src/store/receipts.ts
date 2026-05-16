import { getDb } from "./db.js";
import type { InferenceReceipt } from "../compute/receipt.js";

export interface StoredReceipt {
  receipt: InferenceReceipt;
  response: string;
}

export function saveReceipt(r: InferenceReceipt, response: string) {
  getDb().run("INSERT OR REPLACE INTO receipts VALUES (?,?,?,?,?,?)", [
    r.callId, r.tokenId, r.subscriber.toLowerCase(), r.timestamp, JSON.stringify(r), response,
  ]);
}

export function queryReceipts(tokenId?: string, subscriber?: string, limit = 50): InferenceReceipt[] {
  let sql = "SELECT receipt FROM receipts WHERE 1=1";
  const params: string[] = [];
  if (tokenId) { sql += " AND tokenId=?"; params.push(tokenId); }
  if (subscriber) { sql += " AND subscriber=?"; params.push(subscriber.toLowerCase()); }
  sql += " ORDER BY ts DESC LIMIT ?";
  params.push(limit.toString());
  const rows = getDb().query(sql).all(...params) as { receipt: string }[];
  return rows.map((r) => JSON.parse(r.receipt));
}

// `ts` column = receipt.timestamp = Date.now() (MILLISECONDS). The 24h cutoff
// must therefore be in ms too — comparing to a seconds cutoff (the original
// upstream bug, INT-2) made this count ALL-TIME instead of "today".
export function countCallsToday(tokenId: string): number {
  const cutoff = Date.now() - 86_400_000;
  const row = getDb()
    .query("SELECT COUNT(*) as n FROM receipts WHERE tokenId=? AND ts > ?")
    .get(tokenId, cutoff) as { n: number } | null;
  return row?.n ?? 0;
}

export interface PublicReceipt {
  callId: string;
  tokenId: string;
  subscriber: string;
  timestamp: number;
}

/**
 * Non-sensitive per-token activity feed: tokenId, payer, timestamp ONLY.
 * No prompt / response / outputHash / signature. Powers the public
 * markets "calls" map + activity feed without leaking inference content
 * (the full receipt read stays signature-gated — M3).
 */
export function queryReceiptsPublic(tokenId?: string, limit = 200): PublicReceipt[] {
  let sql = "SELECT callId, tokenId, subscriber, ts FROM receipts WHERE 1=1";
  const params: string[] = [];
  if (tokenId) { sql += " AND tokenId=?"; params.push(tokenId); }
  sql += " ORDER BY ts DESC LIMIT ?";
  params.push(limit.toString());
  const rows = getDb().query(sql).all(...params) as {
    callId: string;
    tokenId: string;
    subscriber: string;
    ts: number;
  }[];
  return rows.map((r) => ({
    callId: r.callId,
    tokenId: r.tokenId,
    subscriber: r.subscriber,
    timestamp: r.ts,
  }));
}

export function getReceipt(callId: string): StoredReceipt | null {
  const row = getDb()
    .query("SELECT receipt, response FROM receipts WHERE callId=?")
    .get(callId) as { receipt: string; response: string } | null;
  return row ? { receipt: JSON.parse(row.receipt), response: row.response } : null;
}
