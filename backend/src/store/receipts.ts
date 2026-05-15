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

export function getReceipt(callId: string): StoredReceipt | null {
  const row = getDb()
    .query("SELECT receipt, response FROM receipts WHERE callId=?")
    .get(callId) as { receipt: string; response: string } | null;
  return row ? { receipt: JSON.parse(row.receipt), response: row.response } : null;
}
