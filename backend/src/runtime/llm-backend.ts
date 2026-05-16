import OpenAI from "openai";
import { cfg } from "../config.js";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMBackend {
  complete(messages: LLMMessage[], model?: string): Promise<string>;
}

// ── OpenAI-compatible HTTP backend (OpenRouter / local Ollama) ────────────────

export class OpenAICompatBackend implements LLMBackend {
  private client: OpenAI;
  private defaultModel: string;

  constructor() {
    this.client = new OpenAI({
      baseURL: cfg.COMPUTE_BASE_URL,
      apiKey: cfg.COMPUTE_API_KEY || "no-key",
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

// ── 0G Compute Network broker backend (TeeML-verified, TEE attestation) ──────
//
// Payment is wallet-based (operator key signs each request, broker settles on
// 0G chain). No API key required — the broker is a singleton shared across all
// 0G-routed agents in this process.

import type { ZGComputeNetworkBroker } from "@0gfoundation/0g-compute-ts-sdk";
import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0gfoundation/0g-compute-ts-sdk";
import type { Hex } from "viem";

let _brokerPromise: Promise<ZGComputeNetworkBroker> | null = null;

export function getZGBroker(): Promise<ZGComputeNetworkBroker> {
  if (_brokerPromise) return _brokerPromise;
  _brokerPromise = (async () => {
    const provider = new ethers.JsonRpcProvider(cfg.ZG_COMPUTE_RPC_URL);
    const wallet = new ethers.Wallet(cfg.OPERATOR_PRIVATE_KEY, provider);
    return createZGComputeNetworkBroker(wallet);
  })();
  return _brokerPromise;
}

export class ZGComputeBackend implements LLMBackend {
  constructor(
    private readonly broker: ZGComputeNetworkBroker,
    private readonly providerAddress: Hex,
  ) {}

  async complete(messages: LLMMessage[]): Promise<string> {
    const { broker, providerAddress } = this;

    // Model and endpoint come from chain via broker
    const meta = await broker.inference.getServiceMetadata(providerAddress);
    const headers = await broker.inference.getRequestHeaders(
      providerAddress,
      messages[messages.length - 1]?.content ?? "",
    );

    const url = `${(meta.endpoint as string).replace(/\/+$/, "")}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers as unknown as Record<string, string>),
      },
      body: JSON.stringify({
        model: meta.model as string,
        messages,
        temperature: 0.1,
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "<unreadable>");
      throw new Error(`0G provider ${res.status}: ${text.slice(0, 400)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return json.choices?.[0]?.message?.content ?? "";
  }
}
