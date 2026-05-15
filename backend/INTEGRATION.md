# Operator API — Frontend Integration Contract

Base URL: `NEXT_PUBLIC_OPERATOR_URL` (default `http://127.0.0.1:8402`).
All responses are JSON. Errors are `{ "error": string }` with a non-2xx status.
Every response carries an `x-request-id` header (quote it in bug reports).
CORS is open (`*`); a per-IP rate limit applies (see each endpoint).

> ⚠️ **Action required (breaking):** `POST /agents/register` now requires an
> owner signature. The current `registerAgentInBackend` in
> `frontend/src/lib/agents.ts` does **not** send it, so the launch page
> "List on Exchange" step fails with `400 {"error":"Required"}`. See
> [§ Register](#post-agentsregister) for the exact fix.

## Compatibility status (as of backend hardening)

| Call | Frontend site | Status |
|------|---------------|--------|
| `POST /agents/test` | `InferenceBox.tsx` | ✅ compatible (extra `subscriber` field ignored) |
| `GET /agents` | `lib/agents.ts` `listAgents` | ✅ compatible |
| `GET /receipts[?tokenId=]` | `lib/agents.ts` `loadInferences` | ✅ compatible (pass a numeric tokenId; `undefined` → 400) |
| `POST /agents/register` | `lib/agents.ts` `registerAgentInBackend` | ❌ **broken — must add owner signature** |
| `POST /x402/infer` + `GET /x402/calls/:id` | not yet wired | paid inference flow, see below |

---

## POST /agents/register

Registers/updates an agent in the operator's runtime registry. **Only the
current on-chain owner of the iNFT may register.** Rate limit: 10/min/IP.

### Request body

```jsonc
{
  "tokenId": "1",                 // required, decimal string
  "ticker": "WAGNT",              // required, 1-16 alphanumeric (server uppercases)
  "owner": "0xFA12…9e38",         // required, must == ownerOf(tokenId) on 0G
  "signature": "0x….(130 hex)",   // required, EIP-191 personal_sign over the message below
  "ts": 1778873230625,            // required, Date.now(); must be within ±10 min of server time
  "name": "Wall Agent",           // optional (default: ticker)
  "description": "",              // optional, ≤2000 chars
  "systemPrompt": "You are …",    // optional (default: "You are <TICKER>, an AI agent on Wall of 0Gents.")
  "model": "google/gemini-2.0-flash-lite-001", // optional
  "priceUsdc": "1000000",         // optional, integer string in USDC 6-dec (default "100000"); used for x402 pricing
  "runtime": "0g-ai",             // optional, "0g-ai" | "openai-compat"
  "shareToken": "0x…",            // optional
  "operatorUrl": "https://…"      // optional, must be a valid URL
}
```

### Canonical message to sign (EXACT — `\n` separators, ticker UPPERCASED)

```
Wall of 0gents :: register agent
tokenId=<tokenId>
ticker=<TICKER>
ts=<ts>
```

### Server verification

1. `|Date.now() - ts| ≤ 600_000` → else `401 signature timestamp out of range`
2. `ownerOf(tokenId)` on 0G `== owner`
3. `verifyMessage({ address: owner, message, signature })` valid
   (supports EOA **and** ERC-1271 smart accounts)

→ on any failure: `401 not authorized: signature must be from the current NFT owner`
→ on success: `200 { ok: true, entry: {...} }`

### Frontend fix (wagmi/viem)

```ts
import { useAccount, useSignMessage } from 'wagmi'

const { address } = useAccount()
const { signMessageAsync } = useSignMessage()

async function registerAgentInBackend(entry: {
  tokenId: string; ticker: string; name: string; description: string
  systemPrompt: string; model: string; priceUsdc: string; runtime: string
  shareToken?: string; operatorUrl?: string
}) {
  const owner = address
  if (!owner) return { ok: false, error: 'wallet not connected' }

  const ts = Date.now()
  const TICKER = entry.ticker.toUpperCase()
  const message =
    `Wall of 0gents :: register agent\n` +
    `tokenId=${entry.tokenId}\n` +
    `ticker=${TICKER}\n` +
    `ts=${ts}`

  const signature = await signMessageAsync({ message }) // 0x + 130 hex

  const res = await fetch(`${OPERATOR_URL}/agents/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...entry, ticker: TICKER, owner, ts, signature }),
  })
  const data = await res.json()
  return res.ok ? { ok: true } : { ok: false, error: data.error ?? 'register failed' }
}
```

> The connected wallet **must be the on-chain owner** of `tokenId` on 0G
> Galileo (chain 16602). The launch flow must mint/transfer the iNFT to the
> user before this call, or registration is rejected.

---

## POST /agents/test  — free inference (no payment)

Rate limit: 10/min/IP. Body: `{ "tokenId": "2", "prompt": "..." }`
(`tokenId` decimal string, `prompt` 1–16000 chars; any extra fields ignored).
→ `200 { callId, response, model }`. Uses the agent's registered
`systemPrompt`/`model` if registered, else a default persona.

## GET /agents

→ `200 AgentEntry[]`. No auth, no body. Response shape unchanged by hardening.

## GET /receipts?tokenId=&subscriber=

→ `200 InferenceReceipt[]` (max 50, newest first). `tokenId` must be a decimal
string and `subscriber` a `0x…40` address if provided, else `400`. Do **not**
pass `tokenId=undefined`/`NaN`.

## GET /profile/:tokenId

`tokenId` must be a decimal string (`/profile/abc` → `400`).
→ `200 { tokenId, owner, registry, dynamic, priceUsdc }`.

## Paid inference (x402)

1. `POST /x402/infer` `{ tokenId, prompt, subscriber }` (no `txHash`)
   → `402 { x402: { scheme, network:"base-sepolia", asset, recipient, minAmount, memo } }`
   `recipient` = the agent's on-chain vault, or the market contract fallback.
   `minAmount` = price in USDC 6-dec (from the agent's registered `priceUsdc`).
2. Pay `≥ minAmount` USDC **from `subscriber`** to `recipient` on Base Sepolia.
3. `POST /x402/infer` again with `{ tokenId, prompt, subscriber, txHash }`
   → `202 { callId, status:"pending" }`.
   Payment binding: the tx must transfer from `subscriber` to `recipient`,
   `≥ minAmount`, and each `txHash` is **single-use** (replay → `409`).
4. Poll `GET /x402/calls/:callId`
   → `{ status:"pending" }` | `{ status:"done", result:{ response, receipt } }`
   | `{ status:"error", error }`. Results survive operator restarts.

Rate limit on `/x402/infer`: 30/min/IP.

## GET /healthz, /readyz

`/healthz` → `200 { ok, operator, ts }` (liveness).
`/readyz` → `200|503 { ok, checks:{ zgRpc, baseRpc, db } }` (dependency probe).

## OG storage

`POST /og-storage/pin` `{...any json...}` → `200 { hash }` (keccak256, content-
addressed, idempotent). `GET /og-storage/:hash` → the stored bytes; `hash` must
match `^0x[0-9a-f]{64}$` (else `400`). Rate limit: 30/min/IP.
