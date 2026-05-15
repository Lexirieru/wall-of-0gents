import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { cfg } from "../config.js";

// Single shared SQLite handle for the whole process. WAL + a busy timeout let
// concurrent readers/writers coexist without SQLITE_BUSY under load.

let _db: Database | null = null;

export function getDb(): Database {
  if (_db) return _db;
  mkdirSync(dirname(cfg.RECEIPTS_DB_PATH), { recursive: true });
  const db = new Database(cfg.RECEIPTS_DB_PATH);
  db.run("PRAGMA journal_mode = WAL;");
  db.run("PRAGMA busy_timeout = 5000;");
  db.run("PRAGMA synchronous = NORMAL;");

  db.run(`
    CREATE TABLE IF NOT EXISTS receipts (
      callId TEXT PRIMARY KEY,
      tokenId TEXT NOT NULL,
      subscriber TEXT NOT NULL,
      ts INTEGER NOT NULL,
      receipt TEXT NOT NULL,
      response TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_token_ts ON receipts(tokenId, ts);
    CREATE INDEX IF NOT EXISTS idx_sub_ts ON receipts(subscriber, ts);

    CREATE TABLE IF NOT EXISTS consumed_payments (
      txHash     TEXT PRIMARY KEY,
      tokenId    TEXT NOT NULL,
      subscriber TEXT NOT NULL,
      amount     TEXT NOT NULL,
      consumedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS calls (
      callId     TEXT PRIMARY KEY,
      txHash     TEXT,
      tokenId    TEXT NOT NULL,
      subscriber TEXT NOT NULL,
      prompt     TEXT NOT NULL,
      status     TEXT NOT NULL,
      error      TEXT,
      createdAt  INTEGER NOT NULL,
      updatedAt  INTEGER NOT NULL,
      attempts   INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);

    CREATE TABLE IF NOT EXISTS consumed_register_sigs (
      sigHash    TEXT PRIMARY KEY,
      tokenId    TEXT NOT NULL,
      consumedAt INTEGER NOT NULL
    );
  `);

  // Migrate older receipts DBs that predate the `response` column.
  const cols = db.query("PRAGMA table_info(receipts)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "response")) {
    db.run("ALTER TABLE receipts ADD COLUMN response TEXT NOT NULL DEFAULT ''");
  }
  // Migrate older DBs that predate the calls.attempts column (M2).
  const callCols = db.query("PRAGMA table_info(calls)").all() as { name: string }[];
  if (callCols.length > 0 && !callCols.some((c) => c.name === "attempts")) {
    db.run("ALTER TABLE calls ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0");
  }

  _db = db;
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
