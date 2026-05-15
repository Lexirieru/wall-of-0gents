import OpenAI from "openai";
import { cfg } from "../config.js";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMBackend {
  complete(messages: LLMMessage[], model?: string): Promise<string>;
}

export class OpenAICompatBackend implements LLMBackend {
  private client: OpenAI;
  private defaultModel: string;

  constructor() {
    this.client = new OpenAI({
      baseURL: cfg.COMPUTE_BASE_URL,
      apiKey: cfg.COMPUTE_API_KEY || "no-key",
      // SDK-level transport hardening: a hung upstream model can't pin a paid
      // call open forever, and transient 429/5xx are retried.
      timeout: cfg.COMPUTE_TIMEOUT_MS,
      maxRetries: cfg.COMPUTE_MAX_RETRIES,
    });
    this.defaultModel = cfg.COMPUTE_MODEL;
  }

  async complete(messages: LLMMessage[], model?: string): Promise<string> {
    const res = await this.client.chat.completions.create(
      {
        model: model ?? this.defaultModel,
        messages,
        max_tokens: cfg.COMPUTE_MAX_TOKENS,
      },
      { timeout: cfg.COMPUTE_TIMEOUT_MS },
    );
    return res.choices[0]?.message?.content ?? "";
  }
}

export function createLLMBackend(): LLMBackend {
  return new OpenAICompatBackend();
}
