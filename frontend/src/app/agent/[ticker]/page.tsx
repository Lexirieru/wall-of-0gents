import Link from 'next/link'
import { loadInferences, readVault, readNftOwner, readFactoryLaunch, readIpoInfo, getBackendAgent } from '@/lib/agents'
import { shortAddr } from '@/lib/format'
import { AgentTabs } from '@/components/market/AgentTabs'
import { CallsToday } from '@/components/market/CallsToday'
import type { Hex } from 'viem'

export const revalidate = 30

const KNOWN_AGENTS: Record<string, {
  ticker: string; tokenId: number; ensName: string; owner: string;
  description: string; model: string;
}> = {
  WAGNT: {
    ticker: 'WAGNT', tokenId: 1, ensName: 'wagnt.wall.eth',
    owner: '0xFA128bBD1846c19025c7428AEE403Fc06F0A9e38',
    description: 'The first Wall of 0gents agent. Powered by Gemini 2.0 Flash Lite via OpenRouter. Sealed weights on 0G storage.',
    model: 'google/gemini-2.0-flash-lite-001',
  },
}


export default async function AgentPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params
  const upper = ticker.toUpperCase()

  let agent = KNOWN_AGENTS[upper]
  if (!agent) {
    const backendEntry = await getBackendAgent(upper).catch(() => null)
    if (backendEntry) {
      agent = {
        ticker: upper,
        tokenId: Number(backendEntry.tokenId),
        ensName: `${upper.toLowerCase()}.wall.eth`,
        owner: '',
        description: backendEntry.description ?? backendEntry.name ?? upper,
        model: backendEntry.model ?? '—',
      }
    } else {
      agent = KNOWN_AGENTS['WAGNT']
    }
  }

  const [inferences, vault, nftOwner, factoryLaunch] = await Promise.all([
    loadInferences(agent.tokenId).catch(() => []),
    readVault(agent.tokenId).catch(() => null),
    readNftOwner(agent.tokenId).catch(() => null),
    readFactoryLaunch(agent.tokenId).catch(() => null),
  ])

  const hasIpo = !!factoryLaunch?.ipo && factoryLaunch.ipo !== '0x0000000000000000000000000000000000000000'

  // Read IPO sold count — source of truth for public sales (pre-minted totalSupply is always 1M)
  let ipoSold = '—'
  if (hasIpo) {
    const ipoInfo = await readIpoInfo(factoryLaunch!.ipo).catch(() => null)
    if (ipoInfo) {
      const sold = Number(ipoInfo.sold / 10n ** 18n).toLocaleString()
      const max = Number(ipoInfo.maxShares / 10n ** 18n).toLocaleString()
      const pct = ipoInfo.maxShares > 0n
        ? (Number(ipoInfo.sold) / Number(ipoInfo.maxShares) * 100).toFixed(2)
        : '0.00'
      ipoSold = `${sold} / ${max} (${pct}%)`
    }
  }
  const activeShareToken = (factoryLaunch?.shareToken ?? vault?.shareToken) as Hex | undefined
  const isRegistered = !!(vault?.active || factoryLaunch)
  const resolvedOwner = nftOwner ?? agent.owner

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ padding: '12px 0', borderBottom: '1px solid var(--hair)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)', display: 'flex', gap: 8 }}>
        <Link href="/markets" style={{ color: 'var(--mute)', textDecoration: 'none' }}>Markets</Link>
        <span>›</span>
        <span style={{ color: 'var(--fg)' }}>{agent.ticker}</span>
        {isRegistered && <span className="pill ok" style={{ fontSize: 9, marginLeft: 'auto' }}>FRACTIONALIZED</span>}
      </div>

      {/* Agent Header */}
      <div style={{ padding: '24px 0', borderBottom: '1px solid var(--hair)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 900, color: 'var(--accent)', margin: 0 }}>{agent.ticker}</h1>
          <span className="pill ok">ERC-7857</span>
          <span className="pill">Token #{agent.tokenId}</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mute)', marginBottom: 8 }}>{agent.ensName}</div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-2)', maxWidth: 600, lineHeight: 1.6, margin: 0 }}>{agent.description}</p>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--hair)', margin: '24px 0' }}>
        <div className="stat">
          <div className="label">IPO Sold</div>
          <div className="value">{ipoSold}</div>
          <div className="delta">public IPO allocation</div>
        </div>
        <div className="stat">
          <div className="label">Vault Balance</div>
          <div className="value">—</div>
          <div className="delta">pending 0G Vault</div>
        </div>
        <CallsToday tokenId={agent.tokenId} />
        <div className="stat">
          <div className="label">Status</div>
          <div className="value" style={{ color: isRegistered ? 'var(--accent)' : undefined }}>
            {isRegistered ? 'LIVE' : 'NFT ONLY'}
          </div>
          <div className="delta">{isRegistered ? 'fractionalized' : 'not yet listed'}</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        {/* Tabs: Call / Buy Shares / Bid NFT */}
        <AgentTabs
          ticker={agent.ticker}
          tokenId={agent.tokenId}
          hasIpo={hasIpo}
          isRegistered={isRegistered}
          ipoAddress={hasIpo ? factoryLaunch!.ipo : undefined}
          inferences={inferences}
        />

        {/* Sidebar */}
        <div>
          <p className="section-h">Contract Info</p>
          <div className="panel" style={{ padding: 14 }}>
            <div className="kv">
              <span className="k">Network</span><span className="v">0G Galileo</span>
              <span className="k">NFT Contract</span>
              <span className="v" style={{ wordBreak: 'break-all', fontSize: 10 }}>
                0x4ce1D1E0e9C769221E03e661abBf043cceD84F1f
              </span>
              <span className="k">Token ID</span><span className="v">#{agent.tokenId}</span>
              <span className="k">Owner</span>
              <span className="v" style={{ wordBreak: 'break-all', fontSize: 10 }}>
                {resolvedOwner ? shortAddr(resolvedOwner as `0x${string}`) : '—'}
              </span>
              <span className="k">Model</span>
              <span className="v" style={{ fontSize: 10, wordBreak: 'break-all' }}>{agent.model}</span>
              {activeShareToken && activeShareToken !== '0x0000000000000000000000000000000000000000' && (
                <>
                  <span className="k">AgentShare</span>
                  <span className="v" style={{ wordBreak: 'break-all', fontSize: 10 }}>
                    {shortAddr(activeShareToken)}
                  </span>
                  {(factoryLaunch?.creator ?? vault?.creator) && (
                    <>
                      <span className="k">Creator</span>
                      <span className="v" style={{ wordBreak: 'break-all', fontSize: 10 }}>
                        {shortAddr((factoryLaunch?.creator ?? vault?.creator) as Hex)}
                      </span>
                    </>
                  )}
                  {hasIpo && (
                    <>
                      <span className="k">IPO Contract</span>
                      <span className="v" style={{ wordBreak: 'break-all', fontSize: 10 }}>
                        {shortAddr(factoryLaunch!.ipo)}
                      </span>
                    </>
                  )}
                  {factoryLaunch?.vault && factoryLaunch.vault !== '0x0000000000000000000000000000000000000000' && (
                    <>
                      <span className="k">Revenue Vault</span>
                      <span className="v" style={{ wordBreak: 'break-all', fontSize: 10 }}>
                        {shortAddr(factoryLaunch.vault)}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <p className="section-h" style={{ marginTop: 20 }}>Explorer</p>
          <div className="panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a
              href={`https://chainscan-galileo.0g.ai/token/0x4ce1D1E0e9C769221E03e661abBf043cceD84F1f?a=${agent.tokenId}`}
              target="_blank" rel="noreferrer"
              style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 11, textDecoration: 'none' }}
            >
              View NFT on 0G Explorer ↗
            </a>
            {activeShareToken && activeShareToken !== '0x0000000000000000000000000000000000000000' && (
              <a
                href={`https://chainscan-galileo.0g.ai/token/${activeShareToken}`}
                target="_blank" rel="noreferrer"
                style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 11, textDecoration: 'none' }}
              >
                View AgentShare on 0G Explorer ↗
              </a>
            )}
            {hasIpo && (
              <a
                href={`https://chainscan-galileo.0g.ai/address/${factoryLaunch!.ipo}`}
                target="_blank" rel="noreferrer"
                style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 11, textDecoration: 'none' }}
              >
                View IPO Contract ↗
              </a>
            )}
          </div>

          {!isRegistered && (
            <>
              <p className="section-h" style={{ marginTop: 20 }}>Listing</p>
              <div className="panel" style={{ padding: 14 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)', lineHeight: 1.6, margin: 0 }}>
                  This agent has not been fractionalized yet. The owner can fractionalize it from the{' '}
                  <Link href="/launch" style={{ color: 'var(--accent)' }}>Deploy page</Link>.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
