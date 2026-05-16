import { OpenAICompatRuntime } from "./openai-compat.js";
import { ZGComputeRuntime } from "./zg-compute.js";
import type { AgentRuntime } from "./types.js";
import { dynamicRegistry } from "../store/dynamic-registry.js";

const runtimeCache = new Map<string, AgentRuntime>();

export function getRuntimeFor(tokenId: bigint): AgentRuntime {
  const agent = dynamicRegistry.get(tokenId);
  const runtimeKey = agent?.runtime === "0g-ai" ? "0g-ai" : "openai-compat";

  if (!runtimeCache.has(runtimeKey)) {
    if (runtimeKey === "0g-ai") {
      runtimeCache.set(runtimeKey, new ZGComputeRuntime());
    } else {
      runtimeCache.set(runtimeKey, new OpenAICompatRuntime());
    }
  }
  return runtimeCache.get(runtimeKey)!;
}
