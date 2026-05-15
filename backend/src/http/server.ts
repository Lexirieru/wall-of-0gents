import { randomUUID } from "node:crypto";
import { cfg } from "../config.js";
import { validateReceipt, makeChallenge, X402Error } from "./x402.js";
import { getAgentInfo, getAgentOwner, authorizeUsage, operatorAccount } from "../chain/clients.js";
import { getRuntimeFor } from "../runtime/index.js";
import { priceFor } from "../runtime/pricing.js";
import { buildReceipt } from "../compute/receipt.js";
import { saveReceipt, queryReceipts, getReceipt } from "../store/receipts.js";
import { dynamicRegistry, type AgentEntry } from "../store/dynamic-registry.js";
import { pinJson, fetchText } from "../storage/og-storage-impl.js";

// In-memory call tracker (expires after 10 min)
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

async function handleInfer(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  if (!body) return err("invalid JSON");

  const { tokenId: tokenIdStr, txHash, prompt, subscriber } = body as Record<string, string>;
  if (!tokenIdStr || !prompt || !subscriber) return err("missing tokenId, prompt, or subscriber");

  const tokenId = BigInt(tokenIdStr);
  const price = priceFor(tokenId);

  // No payment receipt → 402
  if (!txHash) {
    let vaultAddress: string;
    try {
      const info = await getAgentInfo(tokenId);
      vaultAddress = info.vaultBase || cfg.WALL_MARKET;
    } catch {
      vaultAddress = cfg.WALL_MARKET;
    }
    return json({ x402: makeChallenge(vaultAddress, price) }, 402);
  }

  // Validate payment
  let vaultAddr: `0x${string}`;
  try {
    const info = await getAgentInfo(tokenId);
    vaultAddr = (info.vaultBase as `0x${string}`) || (cfg.WALL_MARKET as `0x${string}`);
  } catch {
    vaultAddr = cfg.WALL_MARKET as `0x${string}`;
  }

  try {
    await validateReceipt(txHash as `0x${string}`, vaultAddr, price);
  } catch (e) {
    if (e instanceof X402Error) return err(`payment error: ${e.message}`, 402);
    throw e;
  }

  // Kick off async inference
  const callId = randomUUID();
  const call: PendingCall = { status: "pending", expiresAt: Date.now() + 10 * 60_000 };
  calls.set(callId, call);

  (async () => {
    try {
      const runtime = getRuntimeFor(tokenId);
      const output = await runtime.run({ tokenId, subscriber: subscriber as `0x${string}`, prompt });

      const receipt = buildReceipt({
        callId,
        tokenId,
        subscriber: subscriber as `0x${string}`,
        output: output.response,
        bundleHashBefore: output.bundleHashBefore,
        bundleHashAfter: output.bundleHashAfter,
      });

      await saveReceipt(receipt);

      // Authorize usage on-chain (best-effort)
      const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 3600);
      authorizeUsage(tokenId, subscriber as `0x${string}`, expiresAt).catch(() => {});

      call.status = "done";
      call.result = { callId, response: output.response, receipt };
    } catch (e: unknown) {
      call.status = "error";
      call.error = e instanceof Error ? e.message : String(e);
    }
  })();

  return json({ callId, status: "pending" }, 202);
}

async function handlePollCall(callId: string): Promise<Response> {
  const call = calls.get(callId);
  if (!call) {
    const receipt = await getReceipt(callId);
    if (receipt) return json({ status: "done", result: { callId, receipt } });
    return err("call not found", 404);
  }
  if (call.status === "pending") return json({ callId, status: "pending" });
  if (call.status === "error") return json({ callId, status: "error", error: call.error }, 500);
  return json({ callId, status: "done", result: call.result });
}

async function handleProfile(tokenIdStr: string): Promise<Response> {
  const tokenId = BigInt(tokenIdStr);
  const [owner, isReg] = await Promise.allSettled([
    getAgentOwner(tokenId),
    getAgentInfo(tokenId),
  ]);

  const dynamic = dynamicRegistry.get(tokenId);

  return json({
    tokenId: tokenIdStr,
    owner: owner.status === "fulfilled" ? owner.value : null,
    registry: isReg.status === "fulfilled" ? isReg.value : null,
    dynamic: dynamic ?? null,
    priceUsdc: priceFor(tokenId).toString(),
  });
}

export function createServer() {
  // Clean up stale calls every minute
  setInterval(() => {
    const now = Date.now();
    for (const [id, call] of calls) {
      if (call.expiresAt < now) calls.delete(id);
    }
  }, 60_000);

  return Bun.serve({
    port: cfg.HTTP_PORT,
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;

      if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

      let res: Response;

      // POST /x402/infer
      if (req.method === "POST" && path === "/x402/infer") {
        res = await handleInfer(req).catch((e) => err(String(e), 500));
      }
      // GET /x402/calls/:callId
      else if (req.method === "GET" && path.startsWith("/x402/calls/")) {
        const callId = path.split("/x402/calls/")[1];
        res = await handlePollCall(callId).catch((e) => err(String(e), 500));
      }
      // GET /profile/:tokenId
      else if (req.method === "GET" && path.startsWith("/profile/")) {
        const tokenIdStr = path.split("/profile/")[1];
        res = await handleProfile(tokenIdStr).catch((e) => err(String(e), 500));
      }
      // GET /agents
      else if (req.method === "GET" && path === "/agents") {
        const list = await dynamicRegistry.list();
        res = json(list);
      }
      // POST /agents/register
      else if (req.method === "POST" && path === "/agents/register") {
        const body = await req.json().catch(() => null) as Partial<AgentEntry> | null;
        if (!body?.tokenId || !body?.ticker || !body?.systemPrompt) {
          res = err("missing tokenId, ticker, or systemPrompt");
        } else {
          const entry: AgentEntry = {
            tokenId: body.tokenId,
            ticker: body.ticker,
            name: body.name ?? body.ticker,
            systemPrompt: body.systemPrompt,
            model: body.model,
            priceUsdc: body.priceUsdc ?? "500000",
            createdAt: Date.now(),
          };
          await dynamicRegistry.register(entry);
          res = json({ ok: true, entry });
        }
      }
      // GET /receipts
      else if (req.method === "GET" && path === "/receipts") {
        const tokenId = url.searchParams.get("tokenId") ?? undefined;
        const subscriber = url.searchParams.get("subscriber") ?? undefined;
        const receipts = await queryReceipts(tokenId, subscriber);
        res = json(receipts);
      }
      // POST /og-storage/pin
      else if (req.method === "POST" && path === "/og-storage/pin") {
        const body = await req.json().catch(() => null);
        if (!body) { res = err("invalid JSON"); }
        else {
          const hash = await pinJson(body);
          res = json({ hash });
        }
      }
      // GET /og-storage/:hash
      else if (req.method === "GET" && path.startsWith("/og-storage/")) {
        const hash = path.split("/og-storage/")[1];
        const text = await fetchText(hash);
        if (!text) res = err("not found", 404);
        else res = new Response(text, { status: 200, headers: { "Content-Type": "application/json" } });
      }
      // GET /healthz
      else if (req.method === "GET" && path === "/healthz") {
        res = json({ ok: true, operator: operatorAccount.address, ts: Date.now() });
      }
      else {
        res = err("not found", 404);
      }

      return cors(res);
    },
  });
}
