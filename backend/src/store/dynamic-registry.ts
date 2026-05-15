import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cfg } from "../config.js";

export interface AgentEntry {
  tokenId: string;
  ticker: string;
  name: string;
  description?: string;
  systemPrompt: string;
  model?: string;
  priceUsdc: string;
  runtime?: string;
  vaultBase?: string;
  shareToken?: string;
  operatorUrl?: string;
  createdAt: number;
}

const registryPath = join(cfg.AGENTS_DATA_DIR, "registry.json");

class DynamicRegistry {
  private map = new Map<string, AgentEntry>();
  private loaded = false;

  private async ensureLoaded() {
    if (this.loaded) return;
    this.loaded = true;
    await mkdir(cfg.AGENTS_DATA_DIR, { recursive: true });
    try {
      const raw = await readFile(registryPath, "utf8");
      const entries: AgentEntry[] = JSON.parse(raw);
      for (const e of entries) this.map.set(e.tokenId, e);
    } catch {
      // no file yet
    }
  }

  private async persist() {
    await mkdir(cfg.AGENTS_DATA_DIR, { recursive: true });
    await writeFile(registryPath, JSON.stringify([...this.map.values()], null, 2), "utf8");
  }

  get(tokenId: bigint): AgentEntry | undefined {
    return this.map.get(tokenId.toString());
  }

  async register(entry: AgentEntry) {
    await this.ensureLoaded();
    this.map.set(entry.tokenId, entry);
    await this.persist();
  }

  async remove(tokenId: string) {
    await this.ensureLoaded();
    this.map.delete(tokenId);
    await this.persist();
  }

  async list(): Promise<AgentEntry[]> {
    await this.ensureLoaded();
    return [...this.map.values()];
  }

  async init() {
    await this.ensureLoaded();
  }
}

export const dynamicRegistry = new DynamicRegistry();
