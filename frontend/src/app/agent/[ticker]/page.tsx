import Link from 'next/link'
import { loadInferences } from '@/lib/agents'
import { shortAddr, relativeTime } from '@/lib/format'
import { InferenceBox } from '@/components/market/InferenceBox'

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
  const agent = KNOWN_AGENTS[ticker.toUpperCase()] ?? KNOWN_AGENTS['WAGNT']
  const inferences = await loadInferences(agent.tokenId).catch(() => [])
  const callsToday = inferences.filter(i => i.timestamp > Date.now() / 1000 - 86400).length

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ padding: '12px 0', borderBottom: '1px solid var(--hair)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)', display: 'flex', gap: 8 }}>
        <Link href="/" style={{ color: 'var(--mute)', textDecoration: 'none' }}>Markets</Link>
        <span>›</span>
        <span style={{ color: 'var(--fg)' }}>{agent.ticker}</span>
      </div>

      {/* Agent Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start', padding: '24px 0', borderBottom: '1px solid var(--hair)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 900, color: 'var(--accent)', margin: 0 }}>{agent.ticker}</h1>
            <span className="pill ok">ERC-7857</span>
            <span className="pill">Token #{agent.tokenId}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mute)', marginBottom: 8 }}>{agent.ensName}</div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-2)', maxWidth: 520, lineHeight: 1.6, margin: 0 }}>{agent.description}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn primary">Buy Shares</button>
          <button className="btn">Bid NFT</button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--hair)', margin: '24px 0' }}>
        {[
          { label: 'Price / Share', value: '—', delta: 'USDC · Base Sepolia' },
          { label: 'Shares Sold', value: '—', delta: '/ 1,000,000 total' },
          { label: 'Vault Balance', value: '—', delta: 'pending distribution' },
          { label: 'Calls Today', value: String(callsToday), delta: 'x402 inference' },
        ].map(s => (
          <div key={s.label} className="stat">
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
            <div className="delta">{s.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div>
          {/* Inference box */}
          <p className="section-h">Run Inference</p>
          <InferenceBox tokenId={agent.tokenId} ticker={agent.ticker} />

          {/* Recent inferences */}
          {inferences.length > 0 && (
            <>
              <p className="section-h" style={{ marginTop: 32 }}>Recent Inferences</p>
              <div className="panel">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Subscriber</th>
                      <th>Prompt preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inferences.slice(0, 10).map(inf => (
                      <tr key={inf.id}>
                        <td className="mute">{relativeTime(inf.timestamp)}</td>
                        <td className="mute">{shortAddr(inf.subscriber)}</td>
                        <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inf.prompt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <p className="section-h">Contract Info</p>
          <div className="panel" style={{ padding: 14 }}>
            <div className="kv">
              <span className="k">Network</span><span className="v">0G Galileo</span>
              <span className="k">NFT Contract</span><span className="v" style={{ wordBreak: 'break-all', fontSize: 10 }}>0x4ce1D1…cceD84F1f</span>
              <span className="k">Registry</span><span className="v" style={{ wordBreak: 'break-all', fontSize: 10 }}>0xE26bAF…321F67BAB</span>
              <span className="k">Market</span><span className="v" style={{ wordBreak: 'break-all', fontSize: 10 }}>0x55D7Af…fe3f4045</span>
              <span className="k">Token ID</span><span className="v">#{agent.tokenId}</span>
              <span className="k">Owner</span><span className="v">{shortAddr(agent.owner)}</span>
              <span className="k">Model</span><span className="v" style={{ fontSize: 10, wordBreak: 'break-all' }}>{agent.model}</span>
            </div>
          </div>

          <p className="section-h" style={{ marginTop: 20 }}>Explorer</p>
          <div className="panel" style={{ padding: 14 }}>
            <a
              href={`https://chainscan-galileo.0g.ai/token/0x4ce1D1E0e9C769221E03e661abBf043cceD84F1f?a=${agent.tokenId}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 11, textDecoration: 'none' }}
            >
              View NFT on 0G Explorer ↗
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
