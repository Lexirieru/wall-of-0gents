import { z } from "zod";

const Cfg = z.object({
  // Chain — config-driven so the SAME build runs on testnet or mainnet by env
  // only. 0G Galileo testnet = 16602 (https://evmrpc-testnet.0g.ai);
  // 0G mainnet = 16661 (https://evmrpc.0g.ai).
  ZG_RPC_URL: z.string().url().default("https://evmrpc-testnet.0g.ai"),
  ZG_CHAIN_ID: z.coerce.number().int().positive().default(16602),

  // Wallet
  OPERATOR_PRIVATE_KEY: z.string().startsWith("0x"),
  // L1: optional low-privilege key that ONLY signs receipts. Falls back to the
  // operator key if unset. In production set a separate key so a compromised
  // node can't also act as the on-chain operator/owner.
  RECEIPT_SIGNER_PRIVATE_KEY: z.string().startsWith("0x").optional(),

  // 0G contracts
  WALL_AGENT_NFT: z.string().startsWith("0x"),
  WALL_REGISTRY: z.string().startsWith("0x"),
  WALL_MARKET: z.string().startsWith("0x"),
  // WallFractionalizer — relays usage grants post-launch (it owns the iNFT).
  WALL_FRACTIONALIZER: z.string().startsWith("0x").default("0x2c3a47fdF42a795196C80FFf1775920e562284B4"),

  // x402 settlement asset — ERC-20 on 0G Galileo (the MockUSDC deployed with
  // the contracts). Payments are validated on 0G, not Base anymore.
  PAYMENT_ASSET: z.string().startsWith("0x").default("0x0d837aD954F4f9F06E303A86150ad0F322Ec5EB1"),
  // Reorg protection. Default 1; the validator only enforces this once the RPC
  // head has actually advanced past the tx block (so testnet RPC lag does not
  // false-reject a mined tx). Set higher for production.
  X402_MIN_CONFIRMATIONS: z.coerce.number().int().min(0).default(1),

  // Only trust X-Forwarded-For when behind a known reverse proxy. Off by
  // default so rate-limit keys can't be spoofed by arbitrary clients.
  TRUST_PROXY: z.coerce.boolean().default(false),

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

  // CORS: "*" (default, testnet) or a comma-separated origin allowlist (prod).
  CORS_ORIGINS: z.string().default("*"),

  // Server. Honor the platform-injected $PORT (Railway/Render/etc.) when
  // HTTP_PORT isn't explicitly set, otherwise the app binds the wrong port
  // and the deploy is unreachable.
  HTTP_PORT: z.coerce.number().default(Number(process.env.PORT) || 8402),

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
