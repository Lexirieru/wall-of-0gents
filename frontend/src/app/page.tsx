import Link from 'next/link'
import { listAgents } from '@/lib/agents'
import { shortAddr } from '@/lib/format'

export const revalidate = 30

const FALLBACK = [{ ticker: 'WAGNT', tokenId: 1, ensName: 'wagnt.wall.eth', runtime: '0g-ai', pricePerShareUsdc: '—', cumulativeRevenueUsdc: '—', vaultBalance: '—', callsToday: 0, owner: '0xFA128bBD1846c19025c7428AEE403Fc06F0A9e38' }]

export default async function MarketsPage() {
  let agents = await listAgents().catch(() => FALLBACK)

  return (
    <>
      {/* Hero */}
      <div className="hero-banner">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, alignItems: 'start' }}>
          <div>
            <p className="pill ok" style={{ marginBottom: 12 }}>LIVE · 0G GALILEO TESTNET</p>
            <h1 className="hero-h1">WALL OF<br />0GENTS</h1>
            <p className="hero-tagline">Wall Street for AI agents.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <Link href="/agent/WAGNT">
                <button className="btn primary">View WAGNT ▸</button>
              </Link>
              <Link href="/launch">
                <button className="btn">Deploy Agent</button>
              </Link>
            </div>
          </div>
          <div className="ascii-box">
            <pre style={{ margin: 0, fontSize: 10, lineHeight: 1.5 }}>{`┌─ WALL PROTOCOL ────────────────┐
│                                │
│  Agent NFT (ERC-7857)          │
│    └─ sealed weights + TEE     │
│                                │
│  AgentShare (ERC-20)           │
│    └─ 1,000,000 shares/agent   │
│                                │
│  WallVault                     │
│    └─ inference revenue →      │
│       pro-rata dividends       │
│                                │
│  WallIPO → buy shares          │
│  WallMarket → bid/ask NFT      │
│                                │
└────────────────────────────────┘`}</pre>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="stat-strip">
        <div className="stat">
          <div className="label">Agents Listed</div>
          <div className="value">{agents.length}</div>
          <div className="delta">0G Galileo testnet</div>
        </div>
        <div className="stat">
          <div className="label">Cumulative Revenue</div>
          <div className="value">—</div>
          <div className="delta">USDC · Base Sepolia</div>
        </div>
        <div className="stat">
          <div className="label">Calls Today</div>
          <div className="value">{agents.reduce((s, a) => s + a.callsToday, 0)}</div>
          <div className="delta">via x402 inference</div>
        </div>
      </div>

      {/* Markets table */}
      <div className="markets-head">
        <span className="section-h" style={{ border: 'none', padding: 0, margin: 0 }}>Agent Markets</span>
        <span className="pill" style={{ marginLeft: 'auto' }}>{agents.length} listed</span>
      </div>

      <div className="panel" style={{ marginBottom: 48 }}>
        <div className="panel-head">
          Markets — All Agents
        </div>
        <table className="tbl">
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
                    <button className="btn" style={{ height: 24, fontSize: 10 }}>View ▸</button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* How it works */}
      <p className="section-h">How It Works</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--hair)', marginBottom: 48 }}>
        <div className="panel" style={{ padding: 20 }}>
          <div className="pill ok" style={{ marginBottom: 12 }}>For Builders</div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.6 }}>
            Mint your AI agent as an ERC-7857 iNFT on 0G chain. Seal the weights. Deploy an operator node. Let the market set your valuation.
          </p>
          <Link href="/launch" style={{ display: 'inline-block', marginTop: 16 }}>
            <button className="btn primary">List Your Agent ▸</button>
          </Link>
        </div>
        <div className="panel" style={{ padding: 20 }}>
          <div className="pill" style={{ marginBottom: 12 }}>For Investors</div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.6 }}>
            Buy fractional shares via IPO. Earn pro-rata inference revenue. Trade on the secondary market. Hold sealed-weight security.
          </p>
          <Link href="/agent/WAGNT" style={{ display: 'inline-block', marginTop: 16 }}>
            <button className="btn">Explore Agents ▸</button>
          </Link>
        </div>
      </div>
    </>
  )
}
