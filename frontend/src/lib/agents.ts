import { zgPublicClient } from './chain'
import { CONTRACTS, wallFractionalizerAbi, wallLaunchFactoryAbi, wallIPOPushAbi, erc20Abi } from './abis'
import type { Hex } from 'viem'

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

// Static seed agent — always shown
const WAGNT_STATIC: AgentSummary = {
  ticker: 'WAGNT',
  tokenId: 1,
  ensName: 'wagnt.wall.eth',
  runtime: '0g-ai',
  description: 'The first Wall of 0gents agent. Powered by Gemini 2.0 Flash Lite. Sealed weights on 0G Storage.',
  pricePerShareUsdc: '—',
  cumulativeRevenueUsdc: '—',
  vaultBalance: '—',
  callsToday: 0,
  owner: '0xFA128bBD1846c19025c7428AEE403Fc06F0A9e38',
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

async function fetchBackendAgents(): Promise<BackendEntry[]> {
  try {
    const res = await fetch(`${OPERATOR_URL}/agents`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return []
    const data = await res.json()
    // Backend returns a plain array of AgentEntry
    if (Array.isArray(data)) return data as BackendEntry[]
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
  const today = Math.floor(Date.now() / 1000) - 86400
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
    ensName: `${e.ticker.toLowerCase()}.wall.eth`,
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

  // Merge: WAGNT_STATIC unless backend already has it
  const dynamicTickers = new Set(dynamicAgents.map(a => a.ticker))
  const wagntCalls = callsMap['1'] ?? 0
  const base = dynamicTickers.has('WAGNT')
    ? []
    : [{ ...WAGNT_STATIC, callsToday: wagntCalls }]

  return [...base, ...dynamicAgents]
}

function formatUsdc(raw: string): string {
  const n = Number(raw)
  if (isNaN(n)) return '—'
  // priceUsdc stored as smallest unit (6 decimals for USDC)
  return (n / 1_000_000).toFixed(2)
}

async function loadAllReceipts(): Promise<Array<{ tokenId: number; timestamp: number }>> {
  try {
    const res = await fetch(`${OPERATOR_URL}/receipts`, {
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
    const res = await fetch(`${OPERATOR_URL}/receipts?tokenId=${tokenId}`, {
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
    return 1_000_000n * BigInt(1e18)
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

export async function registerAgentInBackend(entry: {
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
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${OPERATOR_URL}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: (data as { error?: string }).error ?? 'register failed' }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
