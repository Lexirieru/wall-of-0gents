import { randomUUID, createHash } from "node:crypto";
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
} from "../chain/clients.js";
import { getRuntimeFor } from "../runtime/index.js";
import { priceFor, MIN_PRICE } from "../runtime/pricing.js";
import { queryReceipts, queryReceiptsPublic, getReceipt, countCallsToday } from "../store/receipts.js";
import { dynamicRegistry, type AgentEntry } from "../store/dynamic-registry.js";
import { consumePayment, PaymentReplayError } from "../store/payments.js";
import { consumeRegisterSig, RegisterReplayError } from "../store/register-sigs.js";
import { createPendingCall, getCall, listPendingCalls, markCallError, incrementAttempt } from "../store/calls.js";
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
  pollToken: string;
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

// Read+parse a JSON body while hard-capping bytes AS THEY STREAM (not just via
// Content-Length, which a chunked client can omit). Returns null on
// oversize/parse-fail so handlers reject with their normal 400.
async function readJsonCapped(req: Request, max: number): Promise<unknown | null> {
  const reader = req.body?.getReader();
  if (!reader) {
    try {
      return await req.json();
    } catch {
      return null;
    }
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

const CORS_WILDCARD = cfg.CORS_ORIGINS.trim() === "*";
const CORS_ALLOW = new Set(
  cfg.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
);

function cors(res: Response, origin?: string | null): Response {
  if (CORS_WILDCARD) {
    res.headers.set("Access-Control-Allow-Origin", "*");
  } else if (origin && CORS_ALLOW.has(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
  }
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

// Canonical hash over the mutable agent payload. The register signature binds
// THIS so a captured signature can't be replayed with swapped
// systemPrompt/model/priceUsdc/operatorUrl (C1). Must byte-match the FE
// (frontend/src/lib/agents.ts buildRegisterMessage).
function registerPayloadHash(b: {
  name?: string; description?: string; systemPrompt?: string; model?: string;
  priceUsdc?: string; runtime?: string; shareToken?: string; operatorUrl?: string;
}): string {
  const canonical =
    `name=${b.name ?? ""}|description=${b.description ?? ""}|systemPrompt=${b.systemPrompt ?? ""}` +
    `|model=${b.model ?? ""}|priceUsdc=${b.priceUsdc ?? ""}|runtime=${b.runtime ?? ""}` +
    `|shareToken=${b.shareToken ?? ""}|operatorUrl=${b.operatorUrl ?? ""}`;
  return createHash("sha256").update(canonical).digest("hex");
}

function registerMessage(tokenId: string, ticker: string, ts: number, payloadHash: string): string {
  return `Wall of 0gents :: register agent\ntokenId=${tokenId}\nticker=${ticker.toUpperCase()}\nts=${ts}\npayload=${payloadHash}`;
}

// ─── Rate limiting (fixed window, per IP + bucket) ────────────────────────
const RATE: Record<string, { limit: number; windowMs: number }> = {
  infer: { limit: 30, windowMs: 60_000 },
  test: { limit: 10, windowMs: 60_000 },
  register: { limit: 10, windowMs: 60_000 },
  storage: { limit: 30, windowMs: 60_000 },
};
const rlBuckets = new Map<string, { count: number; resetAt: number }>();

// Global ceilings (per-bucket, IP-independent). These cap total throughput so
// an attacker spoofing IPs cannot exceed them — defends C2 (free /agents/test
// LLM-key drain) even if per-IP keying is bypassed.
const GLOBAL_RATE: Record<string, { limit: number; windowMs: number }> = {
  test: { limit: 60, windowMs: 60_000 },
  register: { limit: 60, windowMs: 60_000 },
  storage: { limit: 120, windowMs: 60_000 },
  infer: { limit: 240, windowMs: 60_000 },
};
const globalBuckets = new Map<string, { count: number; resetAt: number }>();

function bump(map: Map<string, { count: number; resetAt: number }>, key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cur = map.get(key);
  if (!cur || cur.resetAt < now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  cur.count++;
  return cur.count > limit;
}

function rateLimited(ip: string, bucket: keyof typeof RATE): boolean {
  const conf = RATE[bucket];
  const perIp = bump(rlBuckets, `${bucket}:${ip}`, conf.limit, conf.windowMs);
  const g = GLOBAL_RATE[bucket];
  const global = g ? bump(globalBuckets, bucket, g.limit, g.windowMs) : false;
  return perIp || global;
}

function clientIp(req: Request, server: BunServer): string {
  // Only honor X-Forwarded-For behind a trusted reverse proxy; otherwise it is
  // attacker-controlled and would let one client forge unlimited rate-limit keys.
  if (cfg.TRUST_PROXY) {
    const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (xff) return xff;
  }
  return (
    server.requestIP(req)?.address ||
    "unknown"
  );
}

// Resolve the on-chain payout vault for a token. Returns null when the agent
// has no real WallVault yet — in that case we MUST NOT issue a payable
// challenge. There is intentionally NO fallback: routing payments to
// WallMarket (its old behaviour) sent USDC to a contract with no payout path
// for x402 deposits, stranding funds. Fail-closed: no vault → not sellable.
async function resolveVault(tokenId: bigint): Promise<`0x${string}` | null> {
  let info: { vaultBase: `0x${string}`; operator: `0x${string}` };
  try {
    info = await getAgentInfo(tokenId);
  } catch {
    return null; // registry read failed / not registered
  }

  // Must be genuinely registered on-chain with a non-zero vault.
  if (info.operator === ZERO || info.vaultBase === ZERO) return null;

  // Defense-in-depth: never point a payer at an EOA / empty address even if
  // the registry somehow holds garbage — the vault must be a contract.
  try {
    const code = await zgPublic.getCode({ address: info.vaultBase });
    if (!code || code === "0x") return null;
  } catch {
    return null;
  }

  return info.vaultBase;
}

function startInference(p: {
  callId: string;
  tokenId: bigint;
  subscriber: `0x${string}`;
  prompt: string;
  txHash: string;
  pollToken: string;
}) {
  const mem: PendingCall = {
    status: "pending",
    expiresAt: Date.now() + 10 * 60_000,
    pollToken: p.pollToken,
  };
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

const MAX_RECOVERY_ATTEMPTS = 3;
const RECOVERY_MAX_AGE_MS = 24 * 60 * 60_000;

/** Re-run paid calls that were left pending by a crash/restart (M2: bounded). */
export async function recoverPendingCalls() {
  const pend = listPendingCalls();
  if (pend.length === 0) return;
  const now = Date.now();
  let recovered = 0;
  for (const c of pend) {
    // Give up on calls that have been retried too many times or are too old —
    // prevents an infinite recover→re-bill loop for a permanently-stuck call.
    if (c.attempts >= MAX_RECOVERY_ATTEMPTS || now - c.createdAt > RECOVERY_MAX_AGE_MS) {
      markCallError(c.callId, "recovery abandoned (max attempts / too old)");
      log.error("recovery abandoned", { callId: c.callId, attempts: c.attempts });
      continue;
    }
    incrementAttempt(c.callId);
    recovered++;
    startInference({
      callId: c.callId,
      tokenId: BigInt(c.tokenId),
      subscriber: c.subscriber as `0x${string}`,
      prompt: c.prompt,
      txHash: c.txHash ?? "",
      pollToken: c.pollToken,
    });
  }
  if (recovered > 0) log.warn("recovering orphaned paid calls", { count: recovered });
}

async function handleInfer(req: Request): Promise<Response> {
  const raw = await readJsonCapped(req, 64 * 1024);
  const parsed = InferSchema.safeParse(raw);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "invalid request");
  const { tokenId: tokenIdStr, txHash, prompt, subscriber } = parsed.data;

  const tokenId = BigInt(tokenIdStr);
  const price = priceFor(tokenId);

  const vaultAddr = await resolveVault(tokenId);
  if (!vaultAddr)
    return err(
      "agent is not payable yet: no on-chain WallVault registered for this token. " +
        "Register the agent on-chain (WallRegistry) before charging for inference.",
      409,
    );

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
  // pollToken is a bearer secret returned ONLY here (to the payer) — required
  // to read the result, so a known callId alone can't leak another user's
  // inference output/receipt (council R2 IDOR).
  const callId = randomUUID();
  const pollToken = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  createPendingCall({ callId, txHash, tokenId, subscriber, prompt, pollToken });
  startInference({ callId, tokenId, subscriber: subscriber as `0x${string}`, prompt, txHash, pollToken });

  return json({ callId, pollToken, status: "pending" }, 202);
}

function handlePollCall(callId: string, token: string): Response {
  // The caller must present the bearer token bound to this call. A wrong /
  // missing token is indistinguishable from "not found" (no existence oracle).
  const expectedToken = calls.get(callId)?.pollToken ?? getCall(callId)?.pollToken;
  if (!expectedToken || token.length === 0 || token !== expectedToken)
    return err("call not found", 404);

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
  const raw = await readJsonCapped(req, 64 * 1024);
  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "invalid request");
  const b = parsed.data;

  if (Math.abs(Date.now() - b.ts) > 10 * 60_000)
    return err("signature timestamp out of range", 401);

  if (b.priceUsdc !== undefined && BigInt(b.priceUsdc) < MIN_PRICE)
    return err(`priceUsdc too low: minimum is ${MIN_PRICE} ($0.0004 USDC)`, 400);

  // Signature must cover the exact mutable payload (C1) ...
  const message = registerMessage(b.tokenId, b.ticker, b.ts, registerPayloadHash(b));
  const ok = await verifyAgentOwner(
    BigInt(b.tokenId),
    b.owner as `0x${string}`,
    message,
    b.signature as `0x${string}`,
  );
  if (!ok) return err("not authorized: signature must be from the current NFT owner or operator", 401);

  // ... and be single-use (kills the ±10-min replay window entirely).
  try {
    consumeRegisterSig(b.signature, b.tokenId);
  } catch (e) {
    if (e instanceof RegisterReplayError) return err("register signature already used", 409);
    throw e;
  }

  const ticker = b.ticker.toUpperCase();
  const entry: AgentEntry = {
    tokenId: b.tokenId,
    ticker,
    name: b.name ?? ticker,
    description: b.description ?? "",
    systemPrompt: b.systemPrompt ?? `You are ${ticker}, an AI agent on Wall of 0Gents.`,
    model: b.model ?? "google/gemini-2.0-flash-lite-001",
    priceUsdc: b.priceUsdc ?? String(MIN_PRICE),
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
  const raw = await readJsonCapped(req, 64 * 1024);
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

// M3: receipts are private. The caller must prove control of `subscriber` with
// a fresh signature; only that subscriber's receipts are returned.
async function handleReceipts(url: URL): Promise<Response> {
  const subscriber = url.searchParams.get("subscriber") ?? "";
  const tsRaw = url.searchParams.get("ts") ?? "";
  const sig = url.searchParams.get("sig") ?? "";
  const tokenId = url.searchParams.get("tokenId") ?? undefined;

  if (!/^0x[0-9a-fA-F]{40}$/.test(subscriber)) return err("invalid or missing subscriber");
  if (!/^\d+$/.test(tsRaw)) return err("invalid or missing ts");
  if (!/^0x[0-9a-fA-F]{130}$/.test(sig)) return err("invalid or missing sig");
  if (tokenId && !/^\d+$/.test(tokenId)) return err("invalid tokenId");

  const ts = Number(tsRaw);
  if (Math.abs(Date.now() - ts) > 10 * 60_000) return err("signature timestamp out of range", 401);

  const message = `Wall of 0gents :: read receipts\nsubscriber=${subscriber.toLowerCase()}\nts=${ts}`;
  let ok = false;
  try {
    ok = await zgPublic.verifyMessage({
      address: subscriber as `0x${string}`,
      message,
      signature: sig as `0x${string}`,
    });
  } catch {
    ok = false;
  }
  if (!ok) return err("not authorized: signature must be from the subscriber", 401);

  return json(queryReceipts(tokenId, subscriber));
}

async function handleReadyz(): Promise<Response> {
  const checks: Record<string, boolean> = {};
  const results = await Promise.allSettled([
    zgPublic.getBlockNumber(),
    Promise.resolve().then(() => getDb().query("SELECT 1").get()),
  ]);
  checks.zgRpc = results[0].status === "fulfilled";
  checks.db = results[1].status === "fulfilled";
  const ok = Object.values(checks).every(Boolean);
  return json({ ok, checks }, ok ? 200 : 503);
}

export function createServer() {
  setInterval(() => {
    const now = Date.now();
    for (const [id, call] of calls) if (call.expiresAt < now) calls.delete(id);
    for (const [k, v] of rlBuckets) if (v.resetAt < now) rlBuckets.delete(k);
    for (const [k, v] of globalBuckets) if (v.resetAt < now) globalBuckets.delete(k);
  }, 60_000);

  return Bun.serve({
    port: cfg.HTTP_PORT,
    async fetch(req, server) {
      const url = new URL(req.url);
      const path = url.pathname;
      const reqId = randomUUID().slice(0, 8);
      const started = Date.now();
      const origin = req.headers.get("origin");

      if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), origin);

      // Body-size cap (council R2): req.json() buffers the whole body in
      // memory before zod ever runs, so an unbounded POST is a memory/disk
      // DoS even with per-request rate limits. og-storage writes to disk so
      // it gets the tighter cap.
      if (req.method === "POST") {
        const max = path === "/og-storage/pin" ? 512 * 1024 : 64 * 1024;
        const len = Number(req.headers.get("content-length") ?? "0");
        if (len > max) return cors(err("request body too large", 413), origin);
      }

      const ip = clientIp(req, server);
      let res: Response;

      try {
        if (req.method === "POST" && path === "/x402/infer") {
          res = rateLimited(ip, "infer") ? err("rate limit exceeded", 429) : await handleInfer(req);
        } else if (req.method === "GET" && path.startsWith("/x402/calls/")) {
          const callId = path.split("/x402/calls/")[1];
          const token = url.searchParams.get("t") ?? "";
          res = callId ? handlePollCall(callId, token) : err("call not found", 404);
        } else if (req.method === "GET" && path.startsWith("/profile/")) {
          res = await handleProfile(path.split("/profile/")[1] ?? "");
        } else if (req.method === "GET" && path === "/agents") {
          res = json(await dynamicRegistry.list());
        } else if (req.method === "POST" && path === "/agents/register") {
          res = rateLimited(ip, "register")
            ? err("rate limit exceeded", 429)
            : await handleRegister(req);
        } else if (req.method === "GET" && path === "/stats") {
          const tokenId = url.searchParams.get("tokenId") ?? "";
          if (!tokenId || !/^\d+$/.test(tokenId)) {
            res = err("invalid or missing tokenId");
          } else {
            res = json({ callsToday: countCallsToday(tokenId) });
          }
        } else if (req.method === "GET" && path === "/receipts/public") {
          // Public, non-sensitive per-token activity (markets feed). No content.
          const tokenId = url.searchParams.get("tokenId") ?? undefined;
          if (tokenId && !/^\d+$/.test(tokenId)) res = err("invalid tokenId");
          else res = json(queryReceiptsPublic(tokenId));
        } else if (req.method === "GET" && path === "/receipts") {
          res = await handleReceipts(url);
        } else if (req.method === "POST" && path === "/og-storage/pin") {
          if (rateLimited(ip, "storage")) res = err("rate limit exceeded", 429);
          else {
            const body = await readJsonCapped(req, 512 * 1024);
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
      return cors(res, origin);
    },
  });
}
