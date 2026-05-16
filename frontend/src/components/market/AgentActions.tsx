'use client'
import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useChainId, useSwitchChain, useConnect } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { injected } from 'wagmi/connectors'
import { parseUnits, http, createPublicClient } from 'viem'
import { CONTRACTS, wallIPOPushAbi, erc20Abi } from '@/lib/abis'
import { zgGalileo } from '@/components/providers/Web3Provider'
import type { Hex } from 'viem'

const ZG_ID = zgGalileo.id
const zgClient = createPublicClient({
  chain: { ...zgGalileo, id: ZG_ID } as never,
  transport: http('https://evmrpc-testnet.0g.ai'),
})

interface IpoStats { available: bigint; pricePerShare: bigint; maxShares: bigint; isOpen: boolean }
type Panel = 'buy' | null

interface Props {
  ipoAddress?: Hex
  ticker: string
  hasIpo: boolean
  isRegistered: boolean
}

export function AgentActions({ ipoAddress, ticker, hasIpo, isRegistered }: Props) {
  const [active, setActive] = useState<Panel>(null)
  const toggle = (p: 'buy') => setActive(prev => prev === p ? null : p)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        {isRegistered && hasIpo ? (
          <button
            className={active === 'buy' ? 'btn' : 'btn primary'}
            onClick={() => toggle('buy')}
            style={{ cursor: 'pointer' }}
          >
            {active === 'buy' ? '✕ close' : 'Buy Shares ▸'}
          </button>
        ) : (
          <button className="btn primary" disabled style={{ opacity: 0.4, cursor: 'not-allowed' }} title="IPO not deployed">
            Buy Shares
          </button>
        )}
      </div>

      {/* Panel */}
      {active === 'buy' && hasIpo && ipoAddress && (
        <BuyPanel ipoAddress={ipoAddress} ticker={ticker} />
      )}
    </div>
  )
}

// ─── Buy Panel ───────────────────────────────────────────────────────────────
function BuyPanel({ ipoAddress, ticker }: { ipoAddress: Hex; ticker: string }) {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const queryClient = useQueryClient()

  const [shares, setShares] = useState('100')
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState('')
  const [err, setErr] = useState('')
  const [stats, setStats] = useState<IpoStats | null>(null)
  const onZg = chainId === ZG_ID

  useEffect(() => {
    async function fetchStats() {
      try {
        const [available, pricePerShare, maxShares, isOpen] = await Promise.all([
          zgClient.readContract({ address: ipoAddress, abi: wallIPOPushAbi, functionName: 'available' }) as Promise<bigint>,
          zgClient.readContract({ address: ipoAddress, abi: wallIPOPushAbi, functionName: 'pricePerShare' }) as Promise<bigint>,
          zgClient.readContract({ address: ipoAddress, abi: wallIPOPushAbi, functionName: 'maxShares' }) as Promise<bigint>,
          zgClient.readContract({ address: ipoAddress, abi: wallIPOPushAbi, functionName: 'isOpen' }) as Promise<boolean>,
        ])
        setStats({ available, pricePerShare, maxShares, isOpen })
      } catch {}
    }
    fetchStats()
  }, [ipoAddress])

  const sharesAmount = BigInt(Math.max(0, Math.floor(Number(shares) || 0))) * BigInt(1e18)
  const usdcCost = stats ? (sharesAmount * stats.pricePerShare) / BigInt(1e18) : 0n
  const priceUsd = stats ? (Number(stats.pricePerShare) / 1e6).toFixed(4) : '...'
  const costUsd = (Number(usdcCost) / 1e6).toFixed(2)
  const availableShares = stats ? Number(stats.available / BigInt(1e18)).toLocaleString() : '...'
  const maxShares = stats ? Number(stats.maxShares / BigInt(1e18)).toLocaleString() : '...'

  const handleBuy = async () => {
    if (!address || sharesAmount === 0n) return
    setBusy(true); setLog(''); setErr('')
    try {
      if (!onZg) { setLog('switching to 0G Galileo...'); await switchChainAsync({ chainId: ZG_ID }) }
      setLog('1/2 approving USDC...')
      const approveTx = await writeContractAsync({
        address: CONTRACTS.mockUsdc, abi: erc20Abi, functionName: 'approve',
        args: [ipoAddress, usdcCost], chainId: ZG_ID,
      })
      let rec1 = null
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000))
        try { rec1 = await zgClient.getTransactionReceipt({ hash: approveTx }); if (rec1) break } catch {}
      }
      if (!rec1) throw new Error('approve timed out')
      setLog('2/2 buying shares...')
      const buyTx = await writeContractAsync({
        address: ipoAddress, abi: wallIPOPushAbi, functionName: 'buy',
        args: [sharesAmount], chainId: ZG_ID,
      })
      let rec2 = null
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000))
        try { rec2 = await zgClient.getTransactionReceipt({ hash: buyTx }); if (rec2) break } catch {}
      }
      if (!rec2) throw new Error('buy tx timed out')
      setLog(`✓ bought ${shares} ${ticker} shares for $${costUsd} USDC`)
      const available = await zgClient.readContract({ address: ipoAddress, abi: wallIPOPushAbi, functionName: 'available' }) as bigint
      setStats(s => s ? { ...s, available } : s)
      void queryClient.invalidateQueries({ queryKey: ['ipoSold', ipoAddress] })
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message.slice(0, 200) : String(e))
    } finally { setBusy(false) }
  }

  return (
    <div style={{ width: '100%', maxWidth: 340, background: 'var(--panel)', border: '1px solid var(--hair)' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em' }}>
          BUY {ticker} SHARES
        </span>
        {stats && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: stats.isOpen ? '#22c55e' : '#f59e0b' }}>
            {stats.isOpen ? '● OPEN' : '◌ CLOSED'}
          </span>
        )}
      </div>

      <div style={{ padding: 14 }}>
        {/* Stats row */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--mute)', marginBottom: 3 }}>PRICE / SHARE</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg)' }}>${priceUsd}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--mute)', marginBottom: 3 }}>AVAILABLE</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg)' }}>
                {availableShares} <span style={{ color: 'var(--mute)', fontSize: 10 }}>/ {maxShares}</span>
              </div>
            </div>
          </div>
        )}

        {!isConnected ? (
          <button className="btn primary" onClick={() => connect({ connector: injected() })} style={{ width: '100%', cursor: 'pointer' }}>
            Connect Wallet
          </button>
        ) : (
          <>
            {/* Amount input */}
            <div style={{ display: 'flex', border: '1px solid var(--hair)', background: '#080808', marginBottom: 8 }}>
              <input
                value={shares}
                onChange={e => setShares(e.target.value.replace(/[^0-9]/g, ''))}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--fg)', padding: '10px 12px' }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', padding: '10px 12px', borderLeft: '1px solid var(--hair)' }}>shares</span>
            </div>

            {/* Cost */}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', marginBottom: 12 }}>
              total cost: <span style={{ color: 'var(--fg)' }}>${costUsd} USDC</span> · mockUSDC on 0G
            </div>

            {/* Action */}
            <button
              className="btn primary"
              onClick={handleBuy}
              disabled={busy || !stats?.isOpen || sharesAmount === 0n}
              style={{ width: '100%', cursor: (busy || !stats?.isOpen) ? 'not-allowed' : 'pointer' }}
            >
              {busy ? '● processing...' : `▸ BUY ${shares || '0'} SHARES`}
            </button>
          </>
        )}

        {log && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: log.startsWith('✓') ? '#22c55e' : 'var(--mute)', marginTop: 10 }}>
            {log}
          </div>
        )}
        {err && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#ef4444', marginTop: 10 }}>
            {err}
          </div>
        )}
      </div>
    </div>
  )
}
