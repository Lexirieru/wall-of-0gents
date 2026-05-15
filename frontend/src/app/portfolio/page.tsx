'use client'
import Link from 'next/link'
import { useAccount } from 'wagmi'

export default function PortfolioPage() {
  const { address, isConnected } = useAccount()

  if (!isConnected) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        <p style={{ color: 'var(--mute)', fontSize: 14 }}>Connect your wallet to view your portfolio.</p>
      </div>
    )
  }

  return (
    <>
      <div style={{ padding: '12px 0', borderBottom: '1px solid var(--hair)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)' }}>
        Portfolio — {address}
      </div>
      <div style={{ padding: '32px 0' }}>
        <p className="section-h">Your Holdings</p>
        <div className="panel" style={{ padding: 20 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mute)' }}>
            No share tokens detected. Buy shares from the <Link href="/" style={{ color: 'var(--accent)' }}>markets page</Link>.
          </p>
        </div>
      </div>
    </>
  )
}
