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
