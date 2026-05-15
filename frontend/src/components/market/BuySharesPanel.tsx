'use client'
import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useChainId, useSwitchChain } from 'wagmi'
import { parseUnits, http, createPublicClient } from 'viem'
import { CONTRACTS, wallIPOPushAbi, erc20Abi } from '@/lib/abis'
import { zgGalileo } from '@/components/providers/Web3Provider'
import type { Hex } from 'viem'

const ZG_ID = zgGalileo.id

const zgClient = createPublicClient({
  chain: { ...zgGalileo, id: ZG_ID } as never,
  transport: http('https://evmrpc-testnet.0g.ai'),
})

interface IpoStats {
  available: bigint
  pricePerShare: bigint
  maxShares: bigint
  isOpen: boolean
}

type Props = { ipoAddress: Hex; ticker: string }

export function BuySharesPanel({ ipoAddress, ticker }: Props) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()

  const [open, setOpen] = useState(false)
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

  const handleBuy = async () => {
    if (!address || sharesAmount === 0n) return
    setBusy(true); setLog(''); setErr('')

    try {
      if (!onZg) {
        setLog('switching to 0G Galileo...')
        await switchChain({ chainId: ZG_ID })
      }

      // Step 1: approve mockUsdc to IPO contract
      setLog('step 1/2: approving mockUsdc...')
      const approveTx = await writeContractAsync({
        address: CONTRACTS.mockUsdc,
        abi: erc20Abi,
        functionName: 'approve',
        args: [ipoAddress, usdcCost],
        chainId: ZG_ID,
      })

      let rec1 = null
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000))
        try { rec1 = await zgClient.getTransactionReceipt({ hash: approveTx }); if (rec1) break } catch {}
      }
      if (!rec1) throw new Error('approve timed out')
      setLog('step 1/2: approved ✓')

      // Step 2: buy shares
      setLog('step 2/2: buying shares...')
      const buyTx = await writeContractAsync({
        address: ipoAddress,
        abi: wallIPOPushAbi,
        functionName: 'buy',
        args: [sharesAmount],
        chainId: ZG_ID,
      })

      let rec2 = null
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000))
        try { rec2 = await zgClient.getTransactionReceipt({ hash: buyTx }); if (rec2) break } catch {}
      }
      if (!rec2) throw new Error('buy tx timed out')

      const costUsdc = (Number(usdcCost) / 1e6).toFixed(2)
      setLog(`✓ bought ${shares} ${ticker} shares for $${costUsdc} USDC`)

      // Refresh stats
      const available = await zgClient.readContract({ address: ipoAddress, abi: wallIPOPushAbi, functionName: 'available' }) as bigint
      setStats(s => s ? { ...s, available } : s)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message.slice(0, 200) : String(e))
    } finally {
      setBusy(false)
    }
  }

  const availableShares = stats ? Number(stats.available / BigInt(1e18)) : null
  const priceUsd = stats ? (Number(stats.pricePerShare) / 1e6).toFixed(3) : '...'
  const costUsd = (Number(usdcCost) / 1e6).toFixed(2)

  if (!open) {
    return (
      <button
        className="btn primary"
        onClick={() => setOpen(true)}
        style={{ cursor: 'pointer' }}
        title={stats?.isOpen === false ? 'IPO not open yet' : undefined}
      >
        Buy Shares
      </button>
    )
  }

  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--hair)', padding: 16, minWidth: 240, maxWidth: 320 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <span>BUY {ticker} SHARES</span>
        {stats && (
          <span style={{ color: stats.isOpen ? '#22c55e' : '#f59e0b' }}>
            {stats.isOpen ? '● OPEN' : '◌ NOT YET OPEN'}
          </span>
        )}
      </div>

      {stats && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span>price: ${priceUsd} USDC / share</span>
          <span>available: {availableShares?.toLocaleString()} of {Number((stats.maxShares) / BigInt(1e18)).toLocaleString()}</span>
        </div>
      )}

      {!isConnected ? (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)' }}>
          Connect wallet to buy.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', border: '1px solid var(--hair)', background: '#080808', marginBottom: 6 }}>
            <input
              value={shares}
              onChange={e => setShares(e.target.value.replace(/[^0-9]/g, ''))}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg)', padding: '8px 10px' }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', padding: '8px 10px', borderLeft: '1px solid var(--hair)' }}>shares</span>
          </div>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', marginBottom: 10 }}>
            cost: ${costUsd} USDC · mockUSDC on 0G Galileo
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn primary"
              onClick={handleBuy}
              disabled={busy || !stats?.isOpen || sharesAmount === 0n}
              style={{ cursor: (busy || !stats?.isOpen) ? 'wait' : 'pointer', fontSize: 11 }}
            >
              {busy ? '● working...' : '▸ BUY'}
            </button>
            <button className="btn" onClick={() => { setOpen(false); setLog(''); setErr('') }} style={{ cursor: 'pointer', fontSize: 11 }}>
              cancel
            </button>
          </div>

          {log && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: log.includes('✓') ? '#22c55e' : 'var(--mute)', marginTop: 8 }}>
              {log}
            </div>
          )}
          {err && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#ef4444', marginTop: 8 }}>
              ERROR: {err}
            </div>
          )}
        </>
      )}
    </div>
  )
}
