import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { cfg } from "../config.js";

const shadowDir = join(cfg.AGENTS_DATA_DIR, "og-shadow");

async function ensureDir() {
  await mkdir(shadowDir, { recursive: true });
}

function contentHash(data: string): string {
  return createHash("keccak256").update(data).digest("hex");
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
  try {
    return await readFile(join(shadowDir, hash), "utf8");
  } catch {
    return null;
  }
}
