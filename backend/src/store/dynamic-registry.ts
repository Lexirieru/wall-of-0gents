import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
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

  private loadPromise: Promise<void> | null = null;
  private writeChain: Promise<void> = Promise.resolve();

  private ensureLoaded(): Promise<void> {
    // Single-flight: concurrent callers await the same load, and `loaded` is
    // only set true *after* the file is actually read (no read race).
    if (this.loaded) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      await mkdir(cfg.AGENTS_DATA_DIR, { recursive: true });
      try {
        const raw = await readFile(registryPath, "utf8");
        const entries: AgentEntry[] = JSON.parse(raw);
        for (const e of entries) this.map.set(e.tokenId, e);
      } catch {
        // no file yet
      }
      this.loaded = true;
    })();
    return this.loadPromise;
  }

  private persist(): Promise<void> {
    // Serialize writes and write atomically (tmp + rename) so concurrent
    // register/remove can't interleave into a corrupt registry.json.
    this.writeChain = this.writeChain.then(async () => {
      await mkdir(cfg.AGENTS_DATA_DIR, { recursive: true });
      const tmp = `${registryPath}.tmp`;
      await writeFile(tmp, JSON.stringify([...this.map.values()], null, 2), "utf8");
      await rename(tmp, registryPath);
    });
    return this.writeChain;
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
