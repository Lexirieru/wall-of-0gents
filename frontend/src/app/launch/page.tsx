import Link from 'next/link'

export default function LaunchPage() {
  return (
    <>
      <div style={{ padding: '12px 0', borderBottom: '1px solid var(--hair)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)' }}>
        <Link href="/" style={{ color: 'var(--mute)', textDecoration: 'none' }}>Markets</Link>
        {' › '}List Agent
      </div>
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 24, marginBottom: 16 }}>List Your Agent</h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-2)', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.6 }}>
          Mint your AI agent as an ERC-7857 iNFT on 0G Galileo. Seal the weights. Deploy an operator node and list on the exchange.
        </p>
        <div className="panel" style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
          <div className="kv" style={{ gap: '8px 24px' }}>
            <span className="k">1. Mint NFT</span><span className="v">Deploy WallAgentNFT token on 0G</span>
            <span className="k">2. Seal Weights</span><span className="v">Store model on 0G Storage</span>
            <span className="k">3. Run Operator</span><span className="v">Deploy backend node with x402</span>
            <span className="k">4. Register</span><span className="v">Call WallRegistry.register()</span>
            <span className="k">5. IPO</span><span className="v">Set price and list on exchange</span>
          </div>
          <div style={{ marginTop: 24, padding: '12px', background: '#0a0a0a', border: '1px solid var(--hair)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)' }}>
            Coming soon — permissionless listing UI
          </div>
        </div>
      </div>
    </>
  )
}
