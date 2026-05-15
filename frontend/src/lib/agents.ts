import { zgPublicClient } from './chain'
import type { Hex } from 'viem'

// zgPublicClient is imported to keep the import live for future on-chain reads
void zgPublicClient

const OPERATOR_URL = process.env.NEXT_PUBLIC_OPERATOR_URL ?? 'http://127.0.0.1:8402'

const _WALL_AGENT_NFT = '0x4ce1D1E0e9C769221E03e661abBf043cceD84F1f' as Hex
const _WALL_REGISTRY = '0xE26bAFF16B7c6119A05a3D65cf499DE321F67BAB' as Hex
const _WALL_MARKET = '0x55D7Af35752065C381Af13a5DcDA86e5Fe3f4045' as Hex

export interface AgentSummary {
  ticker: string
  tokenId: number
  ensName: string
  runtime: string
  pricePerShareUsdc: string
  cumulativeRevenueUsdc: string
  vaultBalance: string
  callsToday: number
  owner: string
}

const STATIC_AGENTS: AgentSummary[] = [
  {
    ticker: 'WAGNT',
    tokenId: 1,
    ensName: 'wagnt.wall.eth',
    runtime: '0g-ai',
    pricePerShareUsdc: '—',
    cumulativeRevenueUsdc: '—',
    vaultBalance: '—',
    callsToday: 0,
    owner: '0xFA128bBD1846c19025c7428AEE403Fc06F0A9e38',
  },
]

export async function listAgents(): Promise<AgentSummary[]> {
  // Try to fetch dynamic agents from operator
  let dynamic: AgentSummary[] = []
  try {
    const res = await fetch(`${OPERATOR_URL}/agents`, { cache: 'no-store', signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const data = await res.json() as Array<{ ticker: string; tokenId: number; ensName?: string }>
      dynamic = data.map(a => ({
        ticker: a.ticker,
        tokenId: a.tokenId,
        ensName: a.ensName ?? '',
        runtime: 'dynamic',
        pricePerShareUsdc: '—',
        cumulativeRevenueUsdc: '—',
        vaultBalance: '—',
        callsToday: 0,
        owner: '',
      }))
    }
  } catch {}

  // Merge: static agents not in dynamic list
  const dynamicTickers = new Set(dynamic.map(a => a.ticker))
  const merged = [
    ...STATIC_AGENTS.filter(a => !dynamicTickers.has(a.ticker)),
    ...dynamic,
  ]
  return merged
}

export async function loadInferences(tokenId: number) {
  try {
    const res = await fetch(`${OPERATOR_URL}/receipts?tokenId=${tokenId}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return []
    const data = await res.json() as Array<{ id: string; prompt: string; timestamp: number; subscriber: string }>
    return data
  } catch {
    return []
  }
}
