import Link from 'next/link'
import { listAgents, readFactoryLaunch, readIpoInfo } from '@/lib/agents'
import { shortAddr } from '@/lib/format'
import type { Hex } from 'viem'

export const revalidate = 30

const FALLBACK = [{ ticker: 'WAGNT', tokenId: 1, ensName: 'wagnt.wall.eth', runtime: '0g-ai', pricePerShareUsdc: '—', cumulativeRevenueUsdc: '—', vaultBalance: '—', callsToday: 0, owner: '0xFA128bBD1846c19025c7428AEE403Fc06F0A9e38' }]

export default async function HomePage() {
  const agents = await listAgents().catch(() => FALLBACK)
  const totalCalls = agents.reduce((s, a) => s + a.callsToday, 0)

  // Enrich agents dengan harga dari chain, hanya tampilkan yang punya IPO
  const enriched = await Promise.all(
    agents.map(async agent => {
      if (agent.pricePerShareUsdc !== '—') return agent
      try {
        const launch = await readFactoryLaunch(agent.tokenId)
        if (launch?.ipo && launch.ipo !== '0x0000000000000000000000000000000000000000') {
          const info = await readIpoInfo(launch.ipo as Hex)
          if (info) {
            const price = (Number(info.pricePerShare) / 1e6).toFixed(4)
            return { ...agent, pricePerShareUsdc: price }
          }
        }
      } catch {}
      return agent
    })
  )
  const featured = enriched.filter(a => a.pricePerShareUsdc !== '—').slice(0, 3)

  return (
    <>
      {/* Hero */}
      <div className="hero-banner">
        <div className="r-main-aside s320" style={{ gap: 32 }}>
          <div>
            <p className="pill ok" style={{ marginBottom: 12 }}>LIVE · 0G GALILEO TESTNET</p>
            <h1 className="hero-h1">WALL OF 0GENTS</h1>
            <p className="hero-tagline">Wall Street for AI agents.</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mute)', lineHeight: 1.7, maxWidth: 460, margin: '12px 0 0' }}>
              List your AI agent on the exchange. People buy shares in it.
              Every call it answers earns a fee, paid out to shareholders on 0G.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <Link href="/markets">
                <button className="btn primary" style={{ cursor: 'pointer' }}>Browse Agents ▸</button>
              </Link>
              <Link href="/launch">
                <button className="btn" style={{ cursor: 'pointer' }}>Launch Your Agent</button>
              </Link>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src="/info.png"
              alt="How Wall of 0Gents works"
              style={{ width: '100%', maxWidth: 320, display: 'block' }}
            />
          </div>
        </div>
      </div>

      {/* Live stats */}
      <div className="r-grid-auto" style={{ gap: 1, background: 'var(--hair)', marginBottom: 40 }}>
        {[
          { label: 'Agents Listed', value: String(agents.length), sub: 'on 0G Mainnet' },
          { label: 'Calls Today', value: String(totalCalls), sub: 'via x402 inference' },
          { label: 'Revenue Distributed', value: '—', sub: 'USDC to shareholders' },
        ].map(s => (
          <div key={s.label} className="stat">
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
            <div className="delta">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Featured agents — hanya tampil kalau ada agent dengan IPO */}
      {featured.length > 0 && <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
          <p className="section-h" style={{ margin: 0, border: 'none', padding: 0 }}>Live Agents</p>
          <Link href="/markets" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', textDecoration: 'none' }}>
            see all {agents.length} →
          </Link>
        </div>
        <div className="r-grid-auto-wide" style={{ gap: 1, background: 'var(--hair)' }}>
          {featured.map(agent => (
            <div key={agent.ticker} className="panel" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className="ticker" style={{ fontSize: 16 }}>{agent.ticker}</span>
                <span className="pill" style={{ marginLeft: 'auto', fontSize: 9 }}>{agent.runtime}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', marginBottom: 4 }}>
                {agent.ensName || shortAddr(agent.owner)}
              </div>
              <div className="r-grid-2" style={{ gap: 4, margin: '12px 0' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--mute)', marginBottom: 2 }}>SHARE PRICE</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: agent.pricePerShareUsdc === '—' ? 'var(--mute)' : 'var(--fg)' }}>
                    {agent.pricePerShareUsdc === '—' ? 'no IPO yet' : `$${agent.pricePerShareUsdc}`}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--mute)', marginBottom: 2 }}>CALLS TODAY</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg)' }}>{agent.callsToday}</div>
                </div>
              </div>
              <Link href={`/agent/${agent.ticker}`}>
                <button className="btn" style={{ width: '100%', cursor: 'pointer', fontSize: 10 }}>View Agent ▸</button>
              </Link>
            </div>
          ))}
        </div>
      </div>}

      {/* Protocol highlights */}
      <p className="section-h">The Protocol</p>
      <div className="r-grid-auto" style={{ gap: 1, background: 'var(--hair)', marginBottom: 40 }}>
        {[
          {
            num: '01',
            title: 'Agent NFT',
            body: 'Your agent lives on-chain as an NFT. The model weights are sealed — no one can copy or modify them after mint.',
          },
          {
            num: '02',
            title: 'Shareholder Revenue',
            body: 'Every time someone calls your agent, a fee goes to the vault. Shareholders can claim their cut anytime.',
          },
          {
            num: '03',
            title: 'Open IPO',
            body: 'After listing, anyone can buy shares in your agent. Price discovery happens in the open market.',
          },
        ].map(item => (
          <div key={item.num} className="panel" style={{ padding: '20px 18px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', marginBottom: 10, letterSpacing: '0.06em' }}>
              {item.num}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 10 }}>
              {item.title}
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)', lineHeight: 1.65, margin: 0 }}>
              {item.body}
            </p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <p className="section-h">How It Works</p>
      <div className="r-grid-2" style={{ gap: 1, background: 'var(--hair)', marginBottom: 48 }}>
        <div className="panel" style={{ padding: 20 }}>
          <div className="pill ok" style={{ marginBottom: 12 }}>For Creators</div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.6 }}>
            Build an AI agent, mint it as an NFT, and put it on the market. Every call your agent answers earns revenue, split between you and your shareholders.
          </p>
          <Link href="/launch" style={{ display: 'inline-block', marginTop: 16 }}>
            <button className="btn primary" style={{ cursor: 'pointer' }}>Launch Your Agent ▸</button>
          </Link>
        </div>
        <div className="panel" style={{ padding: 20 }}>
          <div className="pill" style={{ marginBottom: 12 }}>For Traders</div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.6 }}>
            Buy shares in agents you believe in. Earn a cut of their inference revenue. Sell whenever you want on the open market.
          </p>
          <Link href="/markets" style={{ display: 'inline-block', marginTop: 16 }}>
            <button className="btn primary" style={{ cursor: 'pointer' }}>Browse Agents ▸</button>
          </Link>
        </div>
      </div>
    </>
  )
}
