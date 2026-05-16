import Link from 'next/link'
import { listAgents } from '@/lib/agents'
import { shortAddr } from '@/lib/format'

export const revalidate = 30

const FALLBACK: Awaited<ReturnType<typeof listAgents>> = []

export default async function MarketsPage() {
  const agents = await listAgents().catch(() => FALLBACK)

  return (
    <>
      {/* Header */}
      <div style={{ padding: '28px 0 20px', borderBottom: '1px solid var(--hair)', marginBottom: 24, display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>
          Agent Markets
        </h1>
        <span className="pill" style={{ marginLeft: 4 }}>{agents.length} listed</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', marginLeft: 'auto' }}>
          0G Mainnet · revalidates every 30s
        </span>
      </div>

      {/* Stats strip */}
      <div className="r-grid-auto" style={{ gap: 1, background: 'var(--hair)', marginBottom: 24 }}>
        <div className="stat">
          <div className="label">Agents Listed</div>
          <div className="value">{agents.length}</div>
          <div className="delta">0G Mainnet</div>
        </div>
        <div className="stat">
          <div className="label">Cumulative Revenue</div>
          <div className="value">—</div>
          <div className="delta">USDC</div>
        </div>
        <div className="stat">
          <div className="label">Calls Today</div>
          <div className="value">{agents.reduce((s, a) => s + a.callsToday, 0)}</div>
          <div className="delta">via x402 inference</div>
        </div>
      </div>

      {/* Table — desktop */}
      <div className="panel markets-tbl" style={{ marginBottom: 48 }}>
        <div className="panel-head">All Agents</div>
        <div className="tbl-scroll"><table className="tbl">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>ENS / Name</th>
              <th>Runtime</th>
              <th>Price / Share</th>
              <th>Cum. Revenue</th>
              <th>Vault Balance</th>
              <th>Calls Today</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => (
              <tr key={agent.ticker}>
                <td><span className="ticker">{agent.ticker}</span></td>
                <td><span className="mute">{agent.ensName || shortAddr(agent.owner)}</span></td>
                <td><span className="pill">{agent.runtime}</span></td>
                <td>{agent.pricePerShareUsdc === '—' ? <span className="mute">—</span> : `$${agent.pricePerShareUsdc}`}</td>
                <td>{agent.cumulativeRevenueUsdc === '—' ? <span className="mute">—</span> : `$${agent.cumulativeRevenueUsdc}`}</td>
                <td>{agent.vaultBalance === '—' ? <span className="mute">—</span> : `$${agent.vaultBalance}`}</td>
                <td>{agent.callsToday}</td>
                <td>
                  <Link href={`/agent/${agent.ticker}`}>
                    <button className="btn" style={{ height: 24, fontSize: 10, cursor: 'pointer' }}>View ▸</button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      {/* Cards — mobile */}
      <div className="panel markets-cards" style={{ marginBottom: 48 }}>
        <div className="panel-head">All Agents</div>
        {agents.map(agent => (
          <Link key={agent.ticker} href={`/agent/${agent.ticker}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div className="markets-card">
              <div className="markets-card-top">
                <span className="ticker">{agent.ticker}</span>
                <span className="pill" style={{ marginLeft: 8 }}>{agent.runtime}</span>
                <span className="markets-card-arrow">▸</span>
              </div>
              <div className="markets-card-sub">
                <span>{agent.pricePerShareUsdc === '—' ? <span className="mute">$—</span> : `$${agent.pricePerShareUsdc}`}</span>
                <span className="mute"> · </span>
                <span className="mute">{agent.callsToday} call{agent.callsToday !== 1 ? 's' : ''} today</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ textAlign: 'center', paddingBottom: 24 }}>
        <Link href="/launch">
          <button className="btn primary" style={{ cursor: 'pointer' }}>Launch Your Agent ▸</button>
        </Link>
      </div>
    </>
  )
}
