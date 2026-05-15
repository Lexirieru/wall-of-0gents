import { z } from "zod";

const Cfg = z.object({
  // RPC — single chain: 0G Galileo (16602). Base was removed project-wide.
  ZG_RPC_URL: z.string().url().default("https://evmrpc-testnet.0g.ai"),

  // Wallet
  OPERATOR_PRIVATE_KEY: z.string().startsWith("0x"),

  // 0G contracts
  WALL_AGENT_NFT: z.string().startsWith("0x"),
  WALL_REGISTRY: z.string().startsWith("0x"),
  WALL_MARKET: z.string().startsWith("0x"),

  // x402 settlement asset — ERC-20 on 0G Galileo (the MockUSDC deployed with
  // the contracts). Payments are validated on 0G, not Base anymore.
  PAYMENT_ASSET: z.string().startsWith("0x").default("0x0d837aD954F4f9F06E303A86150ad0F322Ec5EB1"),
  X402_MIN_CONFIRMATIONS: z.coerce.number().int().min(0).default(1),

  // LLM backend
  COMPUTE_BACKEND: z.enum(["openai-compat", "0g-compute"]).default("openai-compat"),
  COMPUTE_BASE_URL: z.string().url().default("http://127.0.0.1:11434/v1"),
  COMPUTE_API_KEY: z.string().default(""),
  COMPUTE_MODEL: z.string().default("qwen2.5-coder:7b"),
  COMPUTE_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  COMPUTE_MAX_TOKENS: z.coerce.number().int().positive().default(1024),
  COMPUTE_MAX_RETRIES: z.coerce.number().int().min(0).default(1),
  ZG_COMPUTE_PROVIDER_ADDRESS: z.string().startsWith("0x").default("0x69Eb5a0BD7d0f4bF39eD5CE9Bd3376c61863aE08"),

  // On-chain read cache TTL for WallRegistry.info (ms)
  AGENT_INFO_CACHE_TTL_MS: z.coerce.number().int().positive().default(60_000),

  // Server
  HTTP_PORT: z.coerce.number().default(8402),

  // Persistence
  AGENTS_DATA_DIR: z.string().default("./data/agents"),
  RECEIPTS_DB_PATH: z.string().default("./data/receipts.db"),
});

export type Config = z.infer<typeof Cfg>;

function loadConfig(): Config {
  const parsed = Cfg.safeParse(process.env);
  if (parsed.success) return parsed.data;

  const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`);
  process.stderr.write(
    `\n✖ Invalid backend configuration. Fix these environment variables (see .env.example):\n${lines.join(
      "\n",
    )}\n\n`,
  );
  process.exit(1);
}

export const cfg = loadConfig();
