'use client'
import { useState } from 'react'
import { useAccount, useWriteContract, useChainId, useSwitchChain } from 'wagmi'
import { parseUnits, http, createPublicClient } from 'viem'
import { CONTRACTS, wallMarketAbi, erc20Abi } from '@/lib/abis'
import { zgGalileo } from '@/components/providers/Web3Provider'

const ZG_ID = zgGalileo.id

const zgClient = createPublicClient({
  chain: { ...zgGalileo, id: ZG_ID } as never,
  transport: http('https://evmrpc.0g.ai'),
})

type Props = { tokenId: number; ticker: string }

export function BidPanel({ tokenId, ticker }: Props) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()

  const [open, setOpen] = useState(false)
  const [bidUsd, setBidUsd] = useState('10')
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState('')
  const [err, setErr] = useState('')
  const onZg = chainId === ZG_ID

  const handleBid = async () => {
    if (!address) return
    setBusy(true); setLog(''); setErr('')

    try {
      if (!onZg) {
        setLog('switching to 0G Galileo...')
        await switchChainAsync({ chainId: ZG_ID })
      }

      // Price in mockUsdc (6 decimals)
      const price = parseUnits(bidUsd, 6)
      const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 86400) // 24h

      // Step 1: approve mockUsdc to WallMarket
      setLog('step 1/2: approving mockUsdc...')
      const approveTx = await writeContractAsync({
        address: CONTRACTS.mockUsdc,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACTS.market, price],
        chainId: ZG_ID,
      })

      let rec1 = null
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000))
        try { rec1 = await zgClient.getTransactionReceipt({ hash: approveTx }); if (rec1) break } catch {}
      }
      if (!rec1) throw new Error('approve timed out')
      setLog('step 1/2: approved ✓')

      // Step 2: postBid
      setLog('step 2/2: posting bid...')
      const bidTx = await writeContractAsync({
        address: CONTRACTS.market,
        abi: wallMarketAbi,
        functionName: 'postBid',
        args: [BigInt(tokenId), price, '0x', expiresAt],
        chainId: ZG_ID,
      })

      let rec2 = null
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000))
        try { rec2 = await zgClient.getTransactionReceipt({ hash: bidTx }); if (rec2) break } catch {}
      }
      if (!rec2) throw new Error('bid tx timed out')

      setLog(`✓ bid posted: $${bidUsd} USDC for ${ticker} NFT`)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message.slice(0, 200) : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" onClick={() => setOpen(true)} style={{ cursor: 'pointer' }}>
          Bid NFT
        </button>
        <button className="btn" disabled style={{ opacity: 0.4, cursor: 'not-allowed' }} title="IPO not yet deployed">
          Buy Shares
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--hair)', padding: 16, minWidth: 240, maxWidth: 300 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em', marginBottom: 12 }}>
        BID ON {ticker} NFT
      </div>

      {!isConnected ? (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)' }}>
          Connect wallet to bid.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', border: '1px solid var(--hair)', background: '#080808', marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', padding: '8px 10px' }}>$</span>
            <input
              value={bidUsd}
              onChange={e => setBidUsd(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg)', padding: '8px 0' }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', padding: '8px 10px', borderLeft: '1px solid var(--hair)' }}>USDC</span>
          </div>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', marginBottom: 10 }}>
            Uses mockUSDC on 0G Galileo · 24h expiry
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn primary" onClick={handleBid} disabled={busy} style={{ cursor: busy ? 'wait' : 'pointer', fontSize: 11 }}>
              {busy ? '● working...' : '▸ PLACE BID'}
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
