import { randomUUID } from "node:crypto";
import type { Server } from "bun";
import { z } from "zod";
import { cfg } from "../config.js";
import { log } from "../log.js";
import { validateReceipt, makeChallenge, X402Error } from "./x402.js";
import {
  getAgentInfo,
  getAgentOwner,
  operatorAccount,
  verifyAgentOwner,
  zgPublic,
  basePublic,
} from "../chain/clients.js";
import { getRuntimeFor } from "../runtime/index.js";
import { priceFor } from "../runtime/pricing.js";
import { queryReceipts, getReceipt } from "../store/receipts.js";
import { dynamicRegistry, type AgentEntry } from "../store/dynamic-registry.js";
import { consumePayment, PaymentReplayError } from "../store/payments.js";
import { createPendingCall, getCall, listPendingCalls } from "../store/calls.js";
import { executeCall } from "../compute/run-call.js";
import { getDb } from "../store/db.js";
import { pinJson, fetchText, isValidHash } from "../storage/og-storage-impl.js";

type BunServer = Server<undefined>;

const ZERO = "0x0000000000000000000000000000000000000000";

// Fast in-memory poll cache (DB is the durable source of truth).
interface PendingCall {
  status: "pending" | "done" | "error";
  result?: unknown;
  error?: string;
  expiresAt: number;
}
const calls = new Map<string, PendingCall>();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function err(msg: string, status = 400) {
  return json({ error: msg }, status);
}

function cors(res: Response): Response {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  return res;
}

// ─── Validation schemas ───────────────────────────────────────────────────
const Address = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "invalid address");
const TxHash = z.string().regex(/^0x[0-9a-fA-F]{64}$/, "invalid tx hash");
const TokenId = z.string().regex(/^\d+$/, "tokenId must be a non-negative integer");
const Ticker = z.string().trim().min(1).max(16).regex(/^[A-Za-z0-9]+$/, "ticker must be alphanumeric");
const PriceUsdc = z.string().regex(/^\d+$/, "priceUsdc must be an integer string");

const InferSchema = z.object({
  tokenId: TokenId,
  prompt: z.string().min(1).max(16_000),
  subscriber: Address,
  txHash: TxHash.optional(),
});

const TestSchema = z.object({
  tokenId: TokenId,
  prompt: z.string().min(1).max(16_000),
});

const RegisterSchema = z.object({
  tokenId: TokenId,
  ticker: Ticker,
  owner: Address,
  signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/, "invalid signature"),
  ts: z.number().int(),
  name: z.string().trim().min(1).max(64).optional(),
  description: z.string().max(2_000).optional(),
  systemPrompt: z.string().max(16_000).optional(),
  model: z.string().max(128).optional(),
  priceUsdc: PriceUsdc.optional(),
  runtime: z.enum(["0g-ai", "openai-compat"]).optional(),
  shareToken: Address.optional(),
  operatorUrl: z.string().url().max(256).optional(),
});

function registerMessage(tokenId: string, ticker: string, ts: number): string {
  return `Wall of 0gents :: register agent\ntokenId=${tokenId}\nticker=${ticker.toUpperCase()}\nts=${ts}`;
}

// ─── Rate limiting (fixed window, per IP + bucket) ────────────────────────
const RATE: Record<string, { limit: number; windowMs: number }> = {
  infer: { limit: 30, windowMs: 60_000 },
  test: { limit: 10, windowMs: 60_000 },
  register: { limit: 10, windowMs: 60_000 },
  storage: { limit: 30, windowMs: 60_000 },
};
const rlBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string, bucket: keyof typeof RATE): boolean {
  const conf = RATE[bucket];
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const cur = rlBuckets.get(key);
  if (!cur || cur.resetAt < now) {
    rlBuckets.set(key, { count: 1, resetAt: now + conf.windowMs });
    return false;
  }
  cur.count++;
  return cur.count > conf.limit;
}

function clientIp(req: Request, server: BunServer): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    server.requestIP(req)?.address ||
    "unknown"
  );
}

// Resolve the on-chain recipient for a token's payments. Returns null when the
// agent is not configured for payment (so we never issue an unpayable challenge).
async function resolveVault(tokenId: bigint): Promise<`0x${string}` | null> {
  let vaultBase = "";
  try {
    vaultBase = (await getAgentInfo(tokenId)).vaultBase;
  } catch {
    /* not registered yet */
  }
  if (vaultBase && vaultBase !== ZERO) return vaultBase as `0x${string}`;
  if (cfg.WALL_MARKET && cfg.WALL_MARKET !== ZERO) return cfg.WALL_MARKET as `0x${string}`;
  return null;
}

function startInference(p: {
  callId: string;
  tokenId: bigint;
  subscriber: `0x${string}`;
  prompt: string;
}) {
  const mem: PendingCall = { status: "pending", expiresAt: Date.now() + 10 * 60_000 };
  calls.set(p.callId, mem);
  void executeCall(p).then((out) => {
    if ("error" in out) {
      mem.status = "error";
      mem.error = out.error;
    } else {
      mem.status = "done";
      mem.result = { callId: out.callId, response: out.response, receipt: out.receipt };
    }
  });
}

/** Re-run paid calls that were left pending by a crash/restart. */
export async function recoverPendingCalls() {
  const pend = listPendingCalls();
  if (pend.length === 0) return;
  log.warn("recovering orphaned paid calls", { count: pend.length });
  for (const c of pend) {
    startInference({
      callId: c.callId,
      tokenId: BigInt(c.tokenId),
      subscriber: c.subscriber as `0x${string}`,
      prompt: c.prompt,
    });
  }
}

async function handleInfer(req: Request): Promise<Response> {
  const raw = await req.json().catch(() => null);
  const parsed = InferSchema.safeParse(raw);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "invalid request");
  const { tokenId: tokenIdStr, txHash, prompt, subscriber } = parsed.data;

  const tokenId = BigInt(tokenIdStr);
  const price = priceFor(tokenId);

  const vaultAddr = await resolveVault(tokenId);
  if (!vaultAddr)
    return err("agent has no payment vault configured (not registered on-chain)", 409);

  // No payment receipt → 402
  if (!txHash) return json({ x402: makeChallenge(vaultAddr, price) }, 402);

  // Validate payment: must be from `subscriber` to the vault, ≥ price.
  try {
    await validateReceipt(
      txHash as `0x${string}`,
      vaultAddr,
      price,
      subscriber as `0x${string}`,
    );
  } catch (e) {
    if (e instanceof X402Error) return err(`payment error: ${e.message}`, 402);
    throw e;
  }

  // Anti-replay: atomically consume the tx bound to (tokenId, subscriber).
  try {
    consumePayment(txHash as `0x${string}`, tokenId, subscriber as `0x${string}`, price);
  } catch (e) {
    if (e instanceof PaymentReplayError)
      return err("payment already used for a previous inference", 409);
    throw e;
  }

  // Persist call state BEFORE running so a crash can't lose a paid call.
  const callId = randomUUID();
  createPendingCall({ callId, txHash, tokenId, subscriber, prompt });
  startInference({ callId, tokenId, subscriber: subscriber as `0x${string}`, prompt });

  return json({ callId, status: "pending" }, 202);
}

function handlePollCall(callId: string): Response {
  const mem = calls.get(callId);
  if (mem) {
    if (mem.status === "pending") return json({ callId, status: "pending" });
    if (mem.status === "error") return json({ callId, status: "error", error: mem.error }, 500);
    return json({ callId, status: "done", result: mem.result });
  }

  // Not in memory → fall back to durable state.
  const stored = getReceipt(callId);
  if (stored)
    return json({
      status: "done",
      result: { callId, response: stored.response, receipt: stored.receipt },
    });

  const row = getCall(callId);
  if (row) {
    if (row.status === "error")
      return json({ callId, status: "error", error: row.error ?? "inference failed" }, 500);
    return json({ callId, status: row.status });
  }

  return err("call not found", 404);
}

async function handleProfile(tokenIdStr: string): Promise<Response> {
  if (!/^\d+$/.test(tokenIdStr)) return err("invalid tokenId");
  const tokenId = BigInt(tokenIdStr);
  const [owner, isReg] = await Promise.allSettled([
    getAgentOwner(tokenId),
    getAgentInfo(tokenId),
  ]);

  return json({
    tokenId: tokenIdStr,
    owner: owner.status === "fulfilled" ? owner.value : null,
    registry: isReg.status === "fulfilled" ? isReg.value : null,
    dynamic: dynamicRegistry.get(tokenId) ?? null,
    priceUsdc: priceFor(tokenId).toString(),
  });
}

async function handleRegister(req: Request): Promise<Response> {
  const raw = await req.json().catch(() => null);
  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "invalid request");
  const b = parsed.data;

  if (Math.abs(Date.now() - b.ts) > 10 * 60_000)
    return err("signature timestamp out of range", 401);

  const message = registerMessage(b.tokenId, b.ticker, b.ts);
  const ok = await verifyAgentOwner(
    BigInt(b.tokenId),
    b.owner as `0x${string}`,
    message,
    b.signature as `0x${string}`,
  );
  if (!ok) return err("not authorized: signature must be from the current NFT owner", 401);

  const ticker = b.ticker.toUpperCase();
  const entry: AgentEntry = {
    tokenId: b.tokenId,
    ticker,
    name: b.name ?? ticker,
    description: b.description ?? "",
    systemPrompt: b.systemPrompt ?? `You are ${ticker}, an AI agent on Wall of 0Gents.`,
    model: b.model ?? "google/gemini-2.0-flash-lite-001",
    priceUsdc: b.priceUsdc ?? "100000",
    runtime: b.runtime ?? "0g-ai",
    shareToken: b.shareToken,
    operatorUrl: b.operatorUrl,
    createdAt: Date.now(),
  };
  await dynamicRegistry.register(entry);
  log.info("agent registered", { tokenId: entry.tokenId, ticker: entry.ticker });
  return json({ ok: true, entry });
}

async function handleTest(req: Request): Promise<Response> {
  const raw = await req.json().catch(() => null);
  const parsed = TestSchema.safeParse(raw);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "invalid request");
  const tokenId = BigInt(parsed.data.tokenId);
  const runtime = getRuntimeFor(tokenId);
  const output = await runtime.run({
    tokenId,
    subscriber: operatorAccount.address,
    prompt: parsed.data.prompt,
  });
  return json({ callId: output.callId, response: output.response, model: output.model });
}

async function handleReadyz(): Promise<Response> {
  const checks: Record<string, boolean> = {};
  const results = await Promise.allSettled([
    zgPublic.getBlockNumber(),
    basePublic.getBlockNumber(),
    Promise.resolve().then(() => getDb().query("SELECT 1").get()),
  ]);
  checks.zgRpc = results[0].status === "fulfilled";
  checks.baseRpc = results[1].status === "fulfilled";
  checks.db = results[2].status === "fulfilled";
  const ok = Object.values(checks).every(Boolean);
  return json({ ok, checks }, ok ? 200 : 503);
}

export function createServer() {
  setInterval(() => {
    const now = Date.now();
    for (const [id, call] of calls) if (call.expiresAt < now) calls.delete(id);
    for (const [k, v] of rlBuckets) if (v.resetAt < now) rlBuckets.delete(k);
  }, 60_000);

  return Bun.serve({
    port: cfg.HTTP_PORT,
    async fetch(req, server) {
      const url = new URL(req.url);
      const path = url.pathname;
      const reqId = randomUUID().slice(0, 8);
      const started = Date.now();

      if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

      const ip = clientIp(req, server);
      let res: Response;

      try {
        if (req.method === "POST" && path === "/x402/infer") {
          res = rateLimited(ip, "infer") ? err("rate limit exceeded", 429) : await handleInfer(req);
        } else if (req.method === "GET" && path.startsWith("/x402/calls/")) {
          const callId = path.split("/x402/calls/")[1];
          res = callId ? handlePollCall(callId) : err("call not found", 404);
        } else if (req.method === "GET" && path.startsWith("/profile/")) {
          res = await handleProfile(path.split("/profile/")[1] ?? "");
        } else if (req.method === "GET" && path === "/agents") {
          res = json(await dynamicRegistry.list());
        } else if (req.method === "POST" && path === "/agents/register") {
          res = rateLimited(ip, "register")
            ? err("rate limit exceeded", 429)
            : await handleRegister(req);
        } else if (req.method === "GET" && path === "/receipts") {
          const tokenId = url.searchParams.get("tokenId") ?? undefined;
          const subscriber = url.searchParams.get("subscriber") ?? undefined;
          if (tokenId && !/^\d+$/.test(tokenId)) res = err("invalid tokenId");
          else if (subscriber && !/^0x[0-9a-fA-F]{40}$/.test(subscriber))
            res = err("invalid subscriber");
          else res = json(queryReceipts(tokenId, subscriber));
        } else if (req.method === "POST" && path === "/og-storage/pin") {
          if (rateLimited(ip, "storage")) res = err("rate limit exceeded", 429);
          else {
            const body = await req.json().catch(() => null);
            if (body == null || typeof body !== "object") res = err("invalid JSON object");
            else res = json({ hash: await pinJson(body) });
          }
        } else if (req.method === "GET" && path.startsWith("/og-storage/")) {
          const hash = path.split("/og-storage/")[1] ?? "";
          if (!isValidHash(hash)) res = err("invalid hash", 400);
          else {
            const text = await fetchText(hash);
            res = text
              ? new Response(text, { status: 200, headers: { "Content-Type": "application/json" } })
              : err("not found", 404);
          }
        } else if (req.method === "POST" && path === "/agents/test") {
          res = rateLimited(ip, "test") ? err("rate limit exceeded", 429) : await handleTest(req);
        } else if (req.method === "GET" && path === "/healthz") {
          res = json({ ok: true, operator: operatorAccount.address, ts: Date.now() });
        } else if (req.method === "GET" && path === "/readyz") {
          res = await handleReadyz();
        } else {
          res = err("not found", 404);
        }
      } catch (e) {
        log.error("unhandled error", {
          reqId,
          method: req.method,
          path,
          err: e instanceof Error ? e.message : String(e),
        });
        res = err("internal server error", 500);
      }

      res.headers.set("x-request-id", reqId);
      log.info("request", {
        reqId,
        method: req.method,
        path,
        status: res.status,
        ms: Date.now() - started,
        ip,
      });
      return cors(res);
    },
  });
}
