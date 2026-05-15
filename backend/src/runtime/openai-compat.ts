import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { createLLMBackend } from "./llm-backend.js";
import type { AgentRuntime, AgentTaskInput, AgentTaskOutput } from "./types.js";
import { dynamicRegistry } from "../store/dynamic-registry.js";

const DEFAULT_SYSTEM = `You are a Wall AI agent — a specialist intelligence running on the Wall of 0gents network. You assist users with Web3, DeFi, AI agent tokenization, and on-chain analytics. Be concise and accurate.`;

function hash(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

export class OpenAICompatRuntime implements AgentRuntime {
  private backend = createLLMBackend();

  async run(input: AgentTaskInput): Promise<AgentTaskOutput> {
    const callId = randomUUID();
    const agent = dynamicRegistry.get(input.tokenId);
    const systemPrompt = input.systemPrompt ?? agent?.systemPrompt ?? DEFAULT_SYSTEM;
    const model = agent?.model ?? undefined;

    const bundleHashBefore = hash(systemPrompt);

    const response = await this.backend.complete(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: input.prompt },
      ],
      model,
    );

    const bundleHashAfter = hash(systemPrompt + response);

    return { callId, response, model: model ?? "default", bundleHashBefore, bundleHashAfter };
  }
}
