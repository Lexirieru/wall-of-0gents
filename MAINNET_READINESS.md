# Wall of 0gents — Mainnet Readiness

Status of the security/economic hardening and the **gates that MUST be cleared
before a mainnet deployment**. Testnet (0G Galileo 16602) is fully patched and
live; the items in §2 and §3 are operational/decision gates, not code bugs.

## 1. Hardened & verified (code + live testnet e2e + council R2)

Smart contracts (UUPS-upgraded / factory redeployed on 0G):
- SC-C1 trusted-factory `WallRegistry.registerFor`; reject zero vault (M4); `__gap` (M5)
- SC-C2 allowance-free `AgentShare.redeemBurn`
- INT-1 `WallFractionalizer.authorizeUsageFor` (operator relays grant post-launch)
- ECON-2 `WallVault` reserve model (no cross-snapshot double-count / insolvency)
- ECON-1 vault `excluded` IPO + `WallIPOPush.sweepUnsold`
- SC-M3 WallMarket 2.5% min out-bid increment
- SC-L2 IPO ceil-div cost; SC-M8 resolver zero-signer ctor guard (source)
- Factory empty/malformed launch-data guard (source)

Backend (no redeploy needed — restart picks up):
- C1 register signature binds sha256(payload) + single-use ledger
- H1 reorg-/lag-safe confirmations · H2 receipt v4 binding (chainId/txHash/prompt/contract)
- H3 X-Forwarded-For only with `TRUST_PROXY` · C2 global rate ceilings
- M2 idempotent bounded boot-recovery · M3 signature-gated `/receipts`
- L1 optional separate `RECEIPT_SIGNER_PRIVATE_KEY`
- callId IDOR closed via per-call `pollToken` bearer secret
- streamed body-size cap + Content-Length 413 + CORS allowlist

Frontend: payload-bound register signature, 0G chain enforcement before pay,
pollToken handling, live factory address.

Test status: SC `forge test` 99/99 · BE `tsc`+`bun test` 12/12 · FE `tsc` clean ·
council round 2 economic 5/5, integration 6/6, security all-blocked.

## 2. MUST do before mainnet (ops / deploy gates)

These are enforced as **loud `PROD-GUARD` warnings at backend boot**:

1. **Real USDC** — `PAYMENT_ASSET` must be the canonical mainnet USDC, NOT the
   permissionless `MockUSDC`. Redeploy contracts pointing at real USDC; update
   backend `PAYMENT_ASSET`, FE `CONTRACTS.mockUsdc`.
2. **Key separation (L1)** — set `RECEIPT_SIGNER_PRIVATE_KEY` to a dedicated
   low-privilege key. `OPERATOR_PRIVATE_KEY` must NOT be the deployer/owner key.
3. **Contract owner = multisig + timelock** — every UUPS proxy `owner` (upgrade
   authority) and `WallRegistry.factory`/`WallFractionalizer.usageOperator`
   setters must be a multisig/timelock, not a single EOA.
4. **CORS** — set `CORS_ORIGINS` to the production frontend origin(s).
5. **Confirmations** — set `X402_MIN_CONFIRMATIONS` ≥ 3 (mainnet value at risk).
6. **Config has no testnet defaults in the deployed env** — explicitly set
   `WALL_*`, `PAYMENT_ASSET`, RPCs; do not rely on code defaults.
7. **Deploy the source-only SC fixes** — SC-M8 (WallResolver ctor) and the
   factory launch-data guard are in source but were not re-broadcast to testnet
   (avoided address churn). They ship with the mainnet deploy. Redeploy
   `WallResolver` and re-point ENS if/when ENS is used.

## 3. Decisions required (product/security trade-offs — not auto-fixed)

- **openMinting / TEE attestation** — `WallAgentNFT.mint` is permissionless by
  design (permissionless agents). `expectedMeasurement = keccak256(caller
  bytes)` is a **testnet placeholder — there is NO real TEE attestation
  verification**. For mainnet either (a) accept permissionless mint and document
  that "verified inference" is operator-attested only (receipts are
  operator-signed, not TEE-proven), or (b) integrate real 0G-compute TEE
  attestation (significant, infra-dependent). **This is a go/no-go decision.**
- **Receipt semantics** — receipts are ECDSA, fully bound (chainId/txHash/
  prompt/output/contract) and non-repudiable *for what the operator asserts*.
  They are not a TEE proof of honest computation. Document accordingly.

## 4. Accepted residuals (low risk, by-design)

- WallVault integer-division dust rolls forward (≤ a few units, never adverse).
- IPO ceil-div rounds ≤1 unit in beneficiary's favor (anti-underpay).
- Body cap via streamed reader handles chunked uploads; Content-Length 413 for
  honest clients. Disk quota on `og-shadow/` is an ops concern (monitor).

## 5. Pre-mainnet checklist

- [ ] Contracts redeployed to mainnet pointing at real USDC; owners = multisig/timelock
- [ ] `RECEIPT_SIGNER_PRIVATE_KEY` set; operator key ≠ deployer/owner
- [ ] `CORS_ORIGINS`, `X402_MIN_CONFIRMATIONS≥3`, all `WALL_*`/`PAYMENT_ASSET` set
- [ ] No `PROD-GUARD` warnings in backend boot log
- [ ] openMinting/TEE decision recorded
- [ ] Full e2e on mainnet fork/staging green
- [ ] Disk/secret monitoring + key custody runbook in place

## 6. Railway (backend hosting) — deploy gates

The operator node is **stateful** (SQLite + flat files). On Railway's
default ephemeral filesystem this is unsafe.

1. 🚨 **Persistent volume (CRITICAL).** Attach a Railway Volume and point
   `RECEIPTS_DB_PATH` + `AGENTS_DATA_DIR` at its mount path. Without it, every
   redeploy/restart wipes: the `consumed_payments` anti-replay ledger (→ a
   already-used payment can be replayed for free inference), the dynamic agent
   registry, and all receipts/pending-call recovery state. **Hard blocker.**
2. 🚨 **Single replica.** SQLite is file-local — multiple Railway replicas each
   get a divergent DB (split anti-replay/registry). Pin replicas = 1, or
   migrate persistence to managed Postgres before scaling.
3. ⚠️ **`TRUST_PROXY=true`.** Behind Railway's edge the real client IP arrives
   via `X-Forwarded-For`; without this, per-IP rate limits collapse to the
   shared proxy IP. Set it (and keep the IP-independent global ceilings).
4. ✅ **$PORT handled** — `HTTP_PORT` now falls back to the platform `$PORT`.
5. ⚠️ Set `CORS_ORIGINS` to the deployed frontend origin; set all `WALL_*`,
   `PAYMENT_ASSET`, `OPERATOR_PRIVATE_KEY` (+ `RECEIPT_SIGNER_PRIVATE_KEY`),
   `COMPUTE_*` as Railway env vars.
6. ✅ Start cmd `bun run start`; SIGTERM graceful shutdown already implemented
   (Railway sends SIGTERM on redeploy).

### Railway checklist
- [ ] Volume attached; `RECEIPTS_DB_PATH`/`AGENTS_DATA_DIR` on the volume
- [ ] Replicas = 1 (or Postgres migration done)
- [ ] `TRUST_PROXY=true`, `CORS_ORIGINS` set, all secrets/env set
- [ ] Boot log shows no `PROD-GUARD`; `/readyz` green from Railway

## 7. 0G Mainnet migration runbook (real market)

Everything is on **0G Galileo testnet (16602) + MockUSDC**. Real market =
redeploy to **0G mainnet** with real USDC. Verified mainnet params:

| Param | Value |
|---|---|
| 0G mainnet chainId | **16661** |
| 0G mainnet RPC | `https://evmrpc.0g.ai` |
| USDC (real) | `0x1f3aa82227281ca364bfb3d253b0f1af1da6473e` — symbol `USDC.e`, **6 decimals** (matches pricing; no math change) |

The backend is now **chain-config-driven** (`ZG_CHAIN_ID` env drives
`makeChallenge.chainId`, receipt `chainId`, viem chain). Same build → mainnet
by env only. Steps:

1. **SC:** deploy the full stack to 16661 with `forge script ... --rpc-url
   https://evmrpc.0g.ai`. **Do NOT deploy `MockUSDC`** — pass the real USDC
   `0x1f3aa8…6473e` as `paymentAsset` to WallMarket/WallVault/factory/IPO.
   Owner of every proxy = **multisig + timelock** (not the deployer EOA).
2. **SC:** record new mainnet proxy addresses; verify on chainscan.
3. **Backend env (Railway):** `ZG_CHAIN_ID=16661`,
   `ZG_RPC_URL=https://evmrpc.0g.ai`,
   `PAYMENT_ASSET=0x1f3aa82227281ca364bfb3d253b0f1af1da6473e`,
   `WALL_AGENT_NFT/WALL_REGISTRY/WALL_MARKET/WALL_FRACTIONALIZER` = mainnet,
   separate `OPERATOR_PRIVATE_KEY` + `RECEIPT_SIGNER_PRIVATE_KEY`,
   `X402_MIN_CONFIRMATIONS>=3`, `CORS_ORIGINS`, `TRUST_PROXY=true`,
   volume-backed data paths. Confirm **zero `PROD-GUARD`** lines at boot.
4. **Frontend:** point chain config (`Web3Provider`/`lib/chain.ts`/`wagmi.ts`)
   at 16661 + `https://evmrpc.0g.ai`; `CONTRACTS` → mainnet addresses;
   `mockUsdc` → real USDC. (FE is still hardcoded to 16602 — must be updated
   for the FE half of the cutover; backend is already env-driven.)
5. **openMinting / TEE go-no-go decision recorded** (see §3).
6. e2e on mainnet with a small real-USDC payment before public launch.

### Mainnet cutover checklist
- [ ] Contracts on 16661, real USDC wired, owners = multisig/timelock
- [ ] Backend env set, no `PROD-GUARD`, `/readyz` green
- [ ] Frontend chain/contracts/USDC switched to mainnet
- [ ] openMinting/TEE decision recorded
- [ ] Real-USDC e2e pass + incident runbook + key custody ready

## 8. ✅ DEPLOYED — 0G Mainnet (chainId 16661)

`DeployMainnet.s.sol` broadcast to `https://evmrpc.0g.ai`. Real-money safe:

| Contract | Address |
|---|---|
| WallAgentNFT | `0x19f1021fF79B7428D4b5618338B02A20aCaD00b9` |
| WallMarket | `0x9B9D66405CDcAdbe5d1F300f67A1F89460e4C364` |
| WallFractionalizer | `0xe5959e5C96348a2275A93630b34cB37571d6C2E7` |
| WallRegistry | `0xd1Ac9b80A872E8891318A3F6d551055EED399E03` |
| WallLaunchFactory | `0x61638a3bb5449F6dB92EB9B81d858c96cb09Bf21` |
| USDC.e (real, 6dp) | `0x1f3AA82227281cA364bFb3d253B0f1af1Da6473E` |

Gaps fixed & verified on-chain:
- **#1** `market.paymentAsset` = real USDC.e (NO MockUSDC deployed).
- **#2** `agentNft.openMinting() == false` + `isMinter(deployer)=true` →
  permissionless fake-agent rug vector CLOSED; agent onboarding is
  operator-curated until real TEE attestation lands.
- Wiring live: `registry.factory`, `fractionalizer.usageOperator`,
  `factory.registry` all set & verified.

Accepted residual risks (operator decision, on record):
- **#3** owner = single EOA `0xFA128…9e38` (the dev/.env key). Total
  upgrade authority over a real-money protocol on one hot key. MUST be
  migrated to a multisig+timelock; until then this is the dominant risk.
- **#4** no external audit (internal multi-round council + live e2e only).
- Permissionless agent creation is disabled on mainnet (the chosen
  security/product tradeoff vs the no-TEE rug vector).
