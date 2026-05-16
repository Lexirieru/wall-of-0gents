'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { zgPublicClient } from '@/lib/chain'
import { CONTRACTS, wallFractionalizerAbi, erc20Abi, wallAgentNftAbi } from '@/lib/abis'
import { shortAddr } from '@/lib/format'
import type { Hex } from 'viem'

interface HoldingRow {
  tokenId: number
  ticker: string
  shareToken: Hex
  shareBalance: bigint
  totalSupply: bigint
  isNftOwner: boolean
  creator: Hex
}

function fmtBal(n: bigint): string {
  return Number(n / BigInt(1e18)).toLocaleString()
}
function fmtPct(bal: bigint, supply: bigint): string {
  if (supply === 0n) return '0.00%'
  return ((Number(bal) / Number(supply)) * 100).toFixed(2) + '%'
}

async function loadPortfolio(address: Hex): Promise<HoldingRow[]> {
  // Scan Fractionalized events for this creator
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
  }).catch(() => [])

  const rows: HoldingRow[] = []

  for (const log of logs) {
    const args = log.args as { tokenId?: bigint; shareToken?: Hex; creator?: Hex }
    if (!args.tokenId || !args.shareToken) continue

    const tokenId = Number(args.tokenId)
    const shareToken = args.shareToken
    const creator = args.creator ?? '0x0' as Hex

    // Check share balance + total supply in parallel
    const [shareBalance, totalSupply, nftOwner] = await Promise.all([
      zgPublicClient.readContract({
        address: shareToken,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      }).catch(() => 0n) as Promise<bigint>,
      zgPublicClient.readContract({
        address: shareToken,
        abi: erc20Abi,
        functionName: 'totalSupply',
      }).catch(() => BigInt(1_000_000) * BigInt(1e18)) as Promise<bigint>,
      zgPublicClient.readContract({
        address: CONTRACTS.agentNft,
        abi: wallAgentNftAbi,
        functionName: 'ownerOf',
        args: [BigInt(tokenId)],
      }).catch(() => null) as Promise<Hex | null>,
    ])

    // Include row if: user has shares OR user is creator
    const isCreator = creator.toLowerCase() === address.toLowerCase()
    const hasShares = (shareBalance as bigint) > 0n
    const isNftOwner = nftOwner?.toLowerCase() === address.toLowerCase()

    if (hasShares || isCreator) {
      // Try to get ticker from vault data (use tokenId as fallback)
      let ticker = `#${tokenId}`
      try {
        const sym = await zgPublicClient.readContract({
          address: shareToken,
          abi: erc20Abi,
          functionName: 'symbol',
        }) as string
        ticker = sym
      } catch {}

      rows.push({
        tokenId,
        ticker,
        shareToken,
        shareBalance: shareBalance as bigint,
        totalSupply: totalSupply as bigint,
        isNftOwner: isNftOwner,
        creator,
      })
    }
  }

  return rows
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount()
  const [holdings, setHoldings] = useState<HoldingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!address || !isConnected) { setHoldings([]); setLoaded(false); return }
    setLoading(true)
    loadPortfolio(address as Hex)
      .then(rows => { setHoldings(rows); setLoaded(true) })
      .catch(() => setLoaded(true))
      .finally(() => setLoading(false))
  }, [address, isConnected])

  if (!isConnected) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        <p style={{ color: 'var(--mute)', fontSize: 14 }}>Connect your wallet to view your portfolio.</p>
      </div>
    )
  }

  return (
    <>
      <div style={{ padding: '12px 0', borderBottom: '1px solid var(--hair)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>Portfolio</span>
        <span style={{ color: 'var(--hair)' }}>·</span>
        <span>{shortAddr(address as `0x${string}`)}</span>
        <span style={{ color: 'var(--hair)' }}>·</span>
        <span>0G Galileo</span>
        {loading && <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: 10 }}>● scanning chain...</span>}
      </div>

      <div style={{ padding: '32px 0' }}>
        <p className="section-h">Your Holdings</p>

        {loading && !loaded && (
          <div style={{ padding: '32px 0', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mute)' }}>
            Scanning WallFractionalizer events on 0G Galileo...
          </div>
        )}

        {loaded && holdings.length === 0 && (
          <div className="panel" style={{ padding: 20 }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mute)', margin: 0 }}>
              No agent shares found.{' '}
              <Link href="/launch" style={{ color: 'var(--accent)' }}>Deploy an agent</Link>{' '}
              or buy shares from the{' '}
              <Link href="/" style={{ color: 'var(--accent)' }}>markets page</Link>.
            </p>
          </div>
        )}

        {holdings.length > 0 && (
          <div className="panel" style={{ marginBottom: 48 }}>
            <div className="panel-head">Agent Holdings</div>
            <div className="tbl-scroll"><table className="tbl cols-6">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Share Balance</th>
                  <th>Ownership %</th>
                  <th>NFT Owner</th>
                  <th>AgentShare</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map(row => (
                  <tr key={row.tokenId}>
                    <td>
                      <span className="ticker">{row.ticker}</span>
                      <span className="mute" style={{ marginLeft: 8, fontSize: 10 }}>#{row.tokenId}</span>
                    </td>
                    <td>{fmtBal(row.shareBalance)}</td>
                    <td>{fmtPct(row.shareBalance, row.totalSupply)}</td>
                    <td>
                      {row.isNftOwner
                        ? <span className="pill ok" style={{ fontSize: 9 }}>YOU</span>
                        : <span className="mute">WallFractionalizer</span>}
                    </td>
                    <td>
                      <a
                        href={`https://chainscan-galileo.0g.ai/token/${row.shareToken}`}
                        target="_blank" rel="noreferrer"
                        style={{ color: 'var(--mute)', fontFamily: 'var(--font-mono)', fontSize: 10, textDecoration: 'none' }}
                      >
                        {shortAddr(row.shareToken)} ↗
                      </a>
                    </td>
                    <td>
                      <Link href={`/agent/${row.ticker}`}>
                        <button className="btn" style={{ height: 24, fontSize: 10 }}>View ▸</button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}

        {/* NFT Ownership note */}
        <p className="section-h">How It Works</p>
        <div className="r-grid-2" style={{ gap: 1, background: 'var(--hair)', marginBottom: 48 }}>
          <div className="panel" style={{ padding: 16 }}>
            <div className="pill" style={{ marginBottom: 10, fontSize: 9 }}>AgentShare ERC-20</div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-2)', lineHeight: 1.6, margin: 0 }}>
              1,000,000 shares minted per agent when fractionalized. Holders earn pro-rata inference revenue from every x402 call.
            </p>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <div className="pill" style={{ marginBottom: 10, fontSize: 9 }}>WallFractionalizer</div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-2)', lineHeight: 1.6, margin: 0 }}>
              The iNFT is locked in WallFractionalizer after fractionalization. Burn 100% of shares to redeem the NFT.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
