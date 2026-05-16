import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { keccak256, toBytes } from "viem";
import { cfg } from "../config.js";

// Content addresses are 0x-prefixed hex strings. Anything else is rejected
// so a caller-supplied "hash" can never escape `shadowDir` via path traversal.
const HASH_RE = /^0x[0-9a-f]{40,128}$/;

const shadowDir = join(cfg.AGENTS_DATA_DIR, "og-shadow");

export function isValidHash(hash: string): boolean {
  return HASH_RE.test(hash);
}

async function ensureDir() {
  await mkdir(shadowDir, { recursive: true });
}

function localHash(data: string): string {
  return keccak256(toBytes(data));
}

// ── 0G Storage helpers ────────────────────────────────────────────────────────

function getIndexer() {
  if (!cfg.ZG_STORAGE_INDEXER_URL) return null;
  // Lazy import to avoid startup errors when 0G Storage is not configured
  return import("@0gfoundation/0g-ts-sdk").then(({ Indexer }) => new Indexer(cfg.ZG_STORAGE_INDEXER_URL!));
}

async function getSigner() {
  const { ethers } = await import("ethers");
  const key = cfg.ZG_STORAGE_PRIVATE_KEY ?? cfg.OPERATOR_PRIVATE_KEY;
  const provider = new ethers.JsonRpcProvider(cfg.ZG_RPC_URL);
  return new ethers.Wallet(key, provider);
}

async function uploadToZG(content: string): Promise<string | null> {
  const indexerPromise = getIndexer();
  if (!indexerPromise) return null;

  try {
    const { MemData } = await import("@0gfoundation/0g-ts-sdk");
    const [indexer, signer] = await Promise.all([indexerPromise, getSigner()]);

    const bytes = Buffer.from(content, "utf8");
    const memData = new MemData(bytes);

    const [result, err] = await indexer.upload(memData, cfg.ZG_RPC_URL, signer);
    if (err) {
      process.stderr.write(`[0G Storage] upload error: ${err}\n`);
      return null;
    }

    const rootHash = "rootHash" in result ? result.rootHash : result.rootHashes[0];
    return rootHash ?? null;
  } catch (e) {
    process.stderr.write(`[0G Storage] upload exception: ${e}\n`);
    return null;
  }
}

async function downloadFromZG(rootHash: string): Promise<string | null> {
  const indexerPromise = getIndexer();
  if (!indexerPromise) return null;

  try {
    const indexer = await indexerPromise;
    const [blob, err] = await indexer.downloadToBlob(rootHash);
    if (err || !blob) return null;
    return await blob.text();
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function pinJson(obj: unknown): Promise<string> {
  await ensureDir();
  const canonical = JSON.stringify(obj, Object.keys(obj as object).sort());

  // Try 0G Storage upload; fall back to local keccak store
  const zgHash = await uploadToZG(canonical);
  if (zgHash) {
    // Cache locally by ZG root hash for fast reads
    const safeName = zgHash.replace(/[^0-9a-fx]/g, "");
    await writeFile(join(shadowDir, safeName), canonical, "utf8").catch(() => null);
    return zgHash;
  }

  const hash = localHash(canonical);
  await writeFile(join(shadowDir, hash), canonical, "utf8");
  return hash;
}

export async function pinText(text: string): Promise<string> {
  await ensureDir();

  const zgHash = await uploadToZG(text);
  if (zgHash) {
    const safeName = zgHash.replace(/[^0-9a-fx]/g, "");
    await writeFile(join(shadowDir, safeName), text, "utf8").catch(() => null);
    return zgHash;
  }

  const hash = localHash(text);
  await writeFile(join(shadowDir, hash), text, "utf8");
  return hash;
}

export async function fetchText(hash: string): Promise<string | null> {
  if (!isValidHash(hash)) return null;

  // Local cache (fast path)
  const safeName = hash.replace(/[^0-9a-fx]/g, "");
  try {
    return await readFile(join(shadowDir, safeName), "utf8");
  } catch {}

  // Fall back to 0G Storage network fetch
  return await downloadFromZG(hash);
}
