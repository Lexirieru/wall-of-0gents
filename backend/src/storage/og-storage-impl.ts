import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { keccak256, toBytes } from "viem";
import { cfg } from "../config.js";

const shadowDir = join(cfg.AGENTS_DATA_DIR, "og-shadow");

// Content addresses are 0x-prefixed keccak256 hex (66 chars). Anything else is rejected
// so a caller-supplied "hash" can never escape `shadowDir` via path traversal.
const HASH_RE = /^0x[0-9a-f]{64}$/;

export function isValidHash(hash: string): boolean {
  return HASH_RE.test(hash);
}

async function ensureDir() {
  await mkdir(shadowDir, { recursive: true });
}

function contentHash(data: string): string {
  return keccak256(toBytes(data));
}

export async function pinJson(obj: unknown): Promise<string> {
  await ensureDir();
  const canonical = JSON.stringify(obj, Object.keys(obj as object).sort());
  const hash = contentHash(canonical);
  await writeFile(join(shadowDir, hash), canonical, "utf8");
  return hash;
}

export async function pinText(text: string): Promise<string> {
  await ensureDir();
  const hash = contentHash(text);
  await writeFile(join(shadowDir, hash), text, "utf8");
  return hash;
}

export async function fetchText(hash: string): Promise<string | null> {
  if (!isValidHash(hash)) return null;
  try {
    return await readFile(join(shadowDir, hash), "utf8");
  } catch {
    return null;
  }
}
