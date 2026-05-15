import { OpenAICompatRuntime } from "./openai-compat.js";
import type { AgentRuntime } from "./types.js";

const runtimeCache = new Map<string, AgentRuntime>();

export function getRuntimeFor(_tokenId: bigint): AgentRuntime {
  const key = "openai-compat";
  if (!runtimeCache.has(key)) runtimeCache.set(key, new OpenAICompatRuntime());
  return runtimeCache.get(key)!;
}
