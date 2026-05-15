import { Database } from "bun:sqlite";
import { cfg } from "../config.js";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { InferenceReceipt } from "../compute/receipt.js";

let _db: Database | null = null;

async function db(): Promise<Database> {
  if (_db) return _db;
  await mkdir(dirname(cfg.RECEIPTS_DB_PATH), { recursive: true });
  _db = new Database(cfg.RECEIPTS_DB_PATH);
  _db.run(`
    CREATE TABLE IF NOT EXISTS receipts (
      callId TEXT PRIMARY KEY,
      tokenId TEXT NOT NULL,
      subscriber TEXT NOT NULL,
      ts INTEGER NOT NULL,
      receipt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_token_ts ON receipts(tokenId, ts);
    CREATE INDEX IF NOT EXISTS idx_sub_ts ON receipts(subscriber, ts);
  `);
  return _db;
}

export async function saveReceipt(r: InferenceReceipt) {
  const d = await db();
  d.run("INSERT OR REPLACE INTO receipts VALUES (?,?,?,?,?)", [
    r.callId, r.tokenId, r.subscriber.toLowerCase(), r.timestamp, JSON.stringify(r),
  ]);
}

export async function queryReceipts(tokenId?: string, subscriber?: string, limit = 50): Promise<InferenceReceipt[]> {
  const d = await db();
  let sql = "SELECT receipt FROM receipts WHERE 1=1";
  const params: string[] = [];
  if (tokenId) { sql += " AND tokenId=?"; params.push(tokenId); }
  if (subscriber) { sql += " AND subscriber=?"; params.push(subscriber.toLowerCase()); }
  sql += " ORDER BY ts DESC LIMIT ?";
  params.push(limit.toString());
  const rows = d.query(sql).all(...params) as { receipt: string }[];
  return rows.map((r) => JSON.parse(r.receipt));
}

export async function getReceipt(callId: string): Promise<InferenceReceipt | null> {
  const d = await db();
  const row = d.query("SELECT receipt FROM receipts WHERE callId=?").get(callId) as { receipt: string } | null;
  return row ? JSON.parse(row.receipt) : null;
}
