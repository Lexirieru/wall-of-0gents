import { zgPublicClient } from './chain'
import { CONTRACTS, wallFractionalizerAbi, wallLaunchFactoryAbi, wallIPOPushAbi, erc20Abi } from './abis'
import type { Hex } from 'viem'
import { sha256, toBytes } from 'viem'

const OPERATOR_URL = process.env.NEXT_PUBLIC_OPERATOR_URL ?? 'http://127.0.0.1:8402'

export interface AgentSummary {
  ticker: string
  tokenId: number
  ensName: string
  runtime: string
  description: string
  pricePerShareUsdc: string
  cumulativeRevenueUsdc: string
  vaultBalance: string
  callsToday: number
  owner: string
  shareToken?: string
  isRegistered?: boolean
}

interface BackendEntry {
  tokenId: string
  ticker: string
  name?: string
  description?: string
  model?: string
  priceUsdc?: string
  runtime?: string
  shareToken?: string
  operatorUrl?: string
  createdAt?: number
}

function isValidEntry(e: unknown): e is BackendEntry {
  if (!e || typeof e !== 'object') return false
  const o = e as Record<string, unknown>
  return typeof o.ticker === 'string' && o.ticker.trim().length > 0 &&
    (typeof o.tokenId === 'string' || typeof o.tokenId === 'number') &&
    Number.isFinite(Number(o.tokenId)) && Number(o.tokenId) > 0
}

async function fetchBackendAgents(): Promise<BackendEntry[]> {
  try {
    const res = await fetch(`${OPERATOR_URL}/agents`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return []
    const data = await res.json()
    if (Array.isArray(data)) return (data as unknown[]).filter(isValidEntry)
    return []
  } catch {
    return []
  }
}

export async function listAgents(): Promise<AgentSummary[]> {
  const [backendEntries, receipts] = await Promise.all([
    fetchBackendAgents(),
    loadAllReceipts(),
  ])

  // Build map of callsToday per tokenId
  const today = Date.now() - 86_400_000 // ms (receipt.timestamp is ms)
  const callsMap: Record<string, number> = {}
  for (const r of receipts) {
    if ((r.timestamp ?? 0) > today) {
      const k = String(r.tokenId)
      callsMap[k] = (callsMap[k] ?? 0) + 1
    }
  }

  // Convert backend entries to AgentSummary
  const dynamicAgents: AgentSummary[] = backendEntries.map(e => ({
    ticker: e.ticker.toUpperCase(),
    tokenId: Number(e.tokenId),
    ensName: '',
    runtime: e.runtime ?? '0g-ai',
    description: e.description ?? e.name ?? e.ticker,
    pricePerShareUsdc: e.priceUsdc ? formatUsdc(e.priceUsdc) : '—',
    cumulativeRevenueUsdc: '—',
    vaultBalance: '—',
    callsToday: callsMap[e.tokenId] ?? 0,
    owner: '',
    shareToken: e.shareToken,
    isRegistered: !!e.shareToken,
  }))

  return dynamicAgents
}

function formatUsdc(raw: string): string {
  const n = Number(raw)
  if (isNaN(n)) return '—'
  const usd = n / 1_000_000
  if (usd === 0) return '0.00'
  if (usd >= 0.01) return usd.toFixed(2)
  return usd.toFixed(6).replace(/0+$/, '')
}

async function loadAllReceipts(): Promise<Array<{ tokenId: number; timestamp: number }>> {
  try {
    const res = await fetch(`${OPERATOR_URL}/receipts/public`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return []
    const data = await res.json()
    if (Array.isArray(data)) {
      return data.map((r: { tokenId?: number; timestamp?: number; ts?: number }) => ({
        tokenId: Number(r.tokenId ?? 0),
        timestamp: Number(r.timestamp ?? r.ts ?? 0),
      }))
    }
    return []
  } catch {
    return []
  }
}

export async function loadInferences(tokenId: number) {
  try {
    const res = await fetch(`${OPERATOR_URL}/receipts/public?tokenId=${tokenId}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return []
    const data = await res.json()
    if (Array.isArray(data)) {
      return data.map((r: { id?: string; callId?: string; prompt?: string; subscriber?: string; timestamp?: number; ts?: number }) => ({
        id: r.id ?? r.callId ?? '',
        prompt: r.prompt ?? '',
        timestamp: Number(r.timestamp ?? r.ts ?? 0),
        subscriber: r.subscriber ?? '',
      }))
    }
    return []
  } catch {
    return []
  }
}

// ─── On-chain reads ────────────────────────────────────────────────────────

export interface VaultInfo {
  shareToken: Hex
  creator: Hex
  active: boolean
}

export async function readVault(tokenId: number): Promise<VaultInfo | null> {
  try {
    const result = await zgPublicClient.readContract({
      address: CONTRACTS.fractionalizer,
      abi: wallFractionalizerAbi,
      functionName: 'vaults',
      args: [BigInt(tokenId)],
    })
    const [shareToken, creator, active] = result as [Hex, Hex, boolean]
    return { shareToken, creator, active }
  } catch {
    return null
  }
}

export async function readVaultBalance(vaultAddress: Hex): Promise<bigint> {
  try {
    const bal = await zgPublicClient.readContract({
      address: CONTRACTS.mockUsdc,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [vaultAddress],
    })
    return bal as bigint
  } catch {
    return 0n
  }
}

export async function readShareBalance(shareToken: Hex, account: Hex): Promise<bigint> {
  try {
    const bal = await zgPublicClient.readContract({
      address: shareToken,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account],
    })
    return bal as bigint
  } catch {
    return 0n
  }
}

export async function readShareTotalSupply(shareToken: Hex): Promise<bigint> {
  try {
    const supply = await zgPublicClient.readContract({
      address: shareToken,
      abi: erc20Abi,
      functionName: 'totalSupply',
    })
    return supply as bigint
  } catch {
    return 1_000_000n * 10n ** 18n
  }
}

export async function readNftOwner(tokenId: number): Promise<Hex | null> {
  try {
    const owner = await zgPublicClient.readContract({
      address: CONTRACTS.agentNft,
      abi: [{ type: 'function', name: 'ownerOf', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }] }] as const,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)],
    })
    return owner as Hex
  } catch {
    return null
  }
}

// Scan WallFractionalizer.Fractionalized events for a given creator address
export async function loadFractionalizedByCreator(creator: Hex): Promise<Array<{ tokenId: number; shareToken: Hex }>> {
  try {
    const logs = await zgPublicClient.getLogs({
      address: CONTRACTS.fractionalizer,
      event: {
        type: 'event', name: 'Fractionalized',
        inputs: [
          { name: 'tokenId', type: 'uint256', indexed: true },
          { name: 'shareToken', type: 'address', indexed: false },
          { name: 'creator', type: 'address', indexed: true },
        ],
      } as const,
      args: { creator },
      fromBlock: 0n,
      toBlock: 'latest',
    })
    return logs.map(l => ({
      tokenId: Number((l.args as { tokenId?: bigint }).tokenId ?? 0n),
      shareToken: ((l.args as { shareToken?: Hex }).shareToken ?? '0x0') as Hex,
    }))
  } catch {
    return []
  }
}

// Scan WallFractionalizer for ALL Fractionalized events to build the full agent list
export async function loadAllFractionalized(): Promise<Array<{ tokenId: number; shareToken: Hex; creator: Hex }>> {
  try {
    const logs = await zgPublicClient.getLogs({
      address: CONTRACTS.fractionalizer,
      event: {
        type: 'event', name: 'Fractionalized',
        inputs: [
          { name: 'tokenId', type: 'uint256', indexed: true },
          { name: 'shareToken', type: 'address', indexed: false },
          { name: 'creator', type: 'address', indexed: true },
        ],
      } as const,
      fromBlock: 0n,
      toBlock: 'latest',
    })
    return logs.map(l => {
      const args = l.args as { tokenId?: bigint; shareToken?: Hex; creator?: Hex }
      return {
        tokenId: Number(args.tokenId ?? 0n),
        shareToken: (args.shareToken ?? '0x0') as Hex,
        creator: (args.creator ?? '0x0') as Hex,
      }
    })
  } catch {
    return []
  }
}

export async function getBackendAgent(ticker: string): Promise<BackendEntry | null> {
  try {
    const entries = await fetchBackendAgents()
    return entries.find(e => e.ticker.toUpperCase() === ticker.toUpperCase()) ?? null
  } catch {
    return null
  }
}

export interface FactoryLaunch {
  shareToken: Hex
  vault: Hex
  ipo: Hex
  creator: Hex
}

export async function readFactoryLaunch(tokenId: number): Promise<FactoryLaunch | null> {
  try {
    const result = await zgPublicClient.readContract({
      address: CONTRACTS.factory,
      abi: wallLaunchFactoryAbi,
      functionName: 'launches',
      args: [BigInt(tokenId)],
    })
    const [shareToken, vault, ipo, creator] = result as [Hex, Hex, Hex, Hex]
    const zero = '0x0000000000000000000000000000000000000000' as Hex
    if (shareToken === zero) return null
    return { shareToken, vault, ipo, creator }
  } catch {
    return null
  }
}

export interface IpoInfo {
  available: bigint
  pricePerShare: bigint
  maxShares: bigint
  sold: bigint
  isOpen: boolean
  startsAt: bigint
  endsAt: bigint
}

export async function readIpoInfo(ipoAddress: Hex): Promise<IpoInfo | null> {
  try {
    const [available, pricePerShare, maxShares, sold, isOpen, startsAt, endsAt] = await Promise.all([
      zgPublicClient.readContract({ address: ipoAddress, abi: wallIPOPushAbi, functionName: 'available' }) as Promise<bigint>,
      zgPublicClient.readContract({ address: ipoAddress, abi: wallIPOPushAbi, functionName: 'pricePerShare' }) as Promise<bigint>,
      zgPublicClient.readContract({ address: ipoAddress, abi: wallIPOPushAbi, functionName: 'maxShares' }) as Promise<bigint>,
      zgPublicClient.readContract({ address: ipoAddress, abi: wallIPOPushAbi, functionName: 'sold' }) as Promise<bigint>,
      zgPublicClient.readContract({ address: ipoAddress, abi: wallIPOPushAbi, functionName: 'isOpen' }) as Promise<boolean>,
      zgPublicClient.readContract({ address: ipoAddress, abi: wallIPOPushAbi, functionName: 'startsAt' }) as Promise<bigint>,
      zgPublicClient.readContract({ address: ipoAddress, abi: wallIPOPushAbi, functionName: 'endsAt' }) as Promise<bigint>,
    ])
    return { available, pricePerShare, maxShares, sold, isOpen, startsAt, endsAt }
  } catch {
    return null
  }
}

export type RegisterEntry = {
  tokenId: string
  ticker: string
  name: string
  description: string
  systemPrompt: string
  model: string
  priceUsdc: string
  runtime: string
  shareToken?: string
  operatorUrl?: string
}

/**
 * sha256 (hex, no 0x) over the mutable payload — MUST byte-match backend
 * `registerPayloadHash`. Binds the signature to the exact agent config so a
 * captured signature can't be replayed with swapped fields (C1).
 */
export function registerPayloadHash(e: RegisterEntry): string {
  const canonical =
    `name=${e.name ?? ''}|description=${e.description ?? ''}|systemPrompt=${e.systemPrompt ?? ''}` +
    `|model=${e.model ?? ''}|priceUsdc=${e.priceUsdc ?? ''}|runtime=${e.runtime ?? ''}` +
    `|shareToken=${e.shareToken ?? ''}|operatorUrl=${e.operatorUrl ?? ''}`
  return sha256(toBytes(canonical)).slice(2)
}

/**
 * Canonical message the backend expects, signed by the NFT owner / registered
 * operator. MUST match backend `registerMessage` exactly: ticker uppercased,
 * `ts` in ms, literal `\n`, payload hash bound.
 */
export function buildRegisterMessage(tokenId: string, ticker: string, ts: number, entry: RegisterEntry): string {
  return `Wall of 0gents :: register agent\ntokenId=${tokenId}\nticker=${ticker.toUpperCase()}\nts=${ts}\npayload=${registerPayloadHash(entry)}`
}

export async function registerAgentInBackend(
  entry: RegisterEntry,
  auth: { owner: string; ts: number; signature: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Use Next.js API route proxy to avoid CORS — browser → /api/agents/register → backend
    const res = await fetch('/api/agents/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, owner: auth.owner, ts: auth.ts, signature: auth.signature }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: (data as { error?: string }).error ?? 'register failed' }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
