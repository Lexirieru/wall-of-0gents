export interface AgentTaskInput {
  tokenId: bigint;
  subscriber: `0x${string}`;
  prompt: string;
  systemPrompt?: string;
}

export interface AgentTaskOutput {
  callId: string;
  response: string;
  model: string;
  bundleHashBefore: string;
  bundleHashAfter: string;
  teeAttestation?: string;
}

export interface AgentRuntime {
  run(input: AgentTaskInput): Promise<AgentTaskOutput>;
}
