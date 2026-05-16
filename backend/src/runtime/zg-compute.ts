import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { getZGBroker, ZGComputeBackend } from "./llm-backend.js";
import type { AgentRuntime, AgentTaskInput, AgentTaskOutput } from "./types.js";
import { dynamicRegistry } from "../store/dynamic-registry.js";
import { cfg } from "../config.js";
import type { Hex } from "viem";

const DEFAULT_SYSTEM = `You are a Wall AI agent — a specialist intelligence running on the Wall of 0gents network, powered by 0G Compute with TEE attestation. You assist users with Web3, DeFi, AI agent tokenization, and on-chain analytics. Be concise and accurate.`;

function hash(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

export class ZGComputeRuntime implements AgentRuntime {
  // Lazy-init: broker spins up on first run() call; subsequent calls reuse it.
  private backendPromise: Promise<ZGComputeBackend> | null = null;

  private getBackend(): Promise<ZGComputeBackend> {
    if (this.backendPromise) return this.backendPromise;
    this.backendPromise = getZGBroker().then(broker =>
      new ZGComputeBackend(broker, cfg.ZG_COMPUTE_PROVIDER_ADDRESS as Hex),
    );
    return this.backendPromise;
  }

  async run(input: AgentTaskInput): Promise<AgentTaskOutput> {
    const callId = randomUUID();
    const agent = dynamicRegistry.get(input.tokenId);
    const systemPrompt = input.systemPrompt ?? agent?.systemPrompt ?? DEFAULT_SYSTEM;

    const bundleHashBefore = hash(systemPrompt);
    const backend = await this.getBackend();

    const response = await backend.complete([
      { role: "system", content: systemPrompt },
      { role: "user", content: input.prompt },
    ]);

    const bundleHashAfter = hash(systemPrompt + response);

    return { callId, response, model: "0g-compute", bundleHashBefore, bundleHashAfter };
  }
}
