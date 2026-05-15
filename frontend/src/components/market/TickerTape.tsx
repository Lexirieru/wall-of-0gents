import { listAgents } from '@/lib/agents'

// Each "chunk" must be wide enough to exceed the viewport so translateX(-50%) is always seamless.
// 10 cells × ~180px/cell = 1800px > 1440px viewport.
const CHUNK = 10

export async function TickerTape() {
  let agents: Awaited<ReturnType<typeof listAgents>> = []
  try { agents = await listAgents() } catch {}

  const base = agents.length ? agents : [
    { ticker: 'WAGNT', runtime: '0g-ai', pricePerShareUsdc: '—', cumulativeRevenueUsdc: '—' },
  ]

  const makeChunk = (offset: number) =>
    Array.from({ length: CHUNK }, (_, i) => {
      const a = base[i % base.length]
      return (
        <div key={`${offset}-${i}`} className="tape-cell">
          <span className="tk">{a.ticker}</span>
          <span className="mu">{a.runtime}</span>
          <span className="pos">{a.pricePerShareUsdc === '—' ? '—' : `$${a.pricePerShareUsdc}`}</span>
          <span className="mu">rev: {a.cumulativeRevenueUsdc === '—' ? '—' : `$${a.cumulativeRevenueUsdc}`}</span>
        </div>
      )
    })

  // Two identical chunks: animate translateX(-50%) scrolls through exactly 1 chunk seamlessly
  return (
    <div className="tape">
      <div className="tape-track">
        {makeChunk(0)}
        {makeChunk(1)}
      </div>
    </div>
  )
}
