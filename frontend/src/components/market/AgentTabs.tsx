'use client'
import { useState, useEffect, useLayoutEffect, useRef, forwardRef } from 'react'
import { useAccount, useWriteContract, useChainId, useSwitchChain, useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { parseUnits } from 'viem'
import { gsap } from 'gsap'
import { CONTRACTS, wallIPOPushAbi, erc20Abi } from '@/lib/abis'
import { zgGalileo } from '@/components/providers/Web3Provider'
import { zgPublicClient as zgClient } from '@/lib/chain'
import { shortAddr, relativeTime } from '@/lib/format'
import { InferenceBox } from './InferenceBox'
import type { Hex } from 'viem'

const ZG_ID = zgGalileo.id

interface IpoStats { available: bigint; pricePerShare: bigint; maxShares: bigint; isOpen: boolean }
interface Inference { id: string; timestamp: number; subscriber: string; prompt: string }
type Tab = 'call' | 'buy'
const TAB_ORDER: Tab[] = ['call', 'buy']

interface Props {
  ticker: string
  tokenId: number
  hasIpo: boolean
  isRegistered: boolean
  ipoAddress?: Hex
  inferences: Inference[]
  priceUsdc?: string
}

interface TabBtnProps {
  label: string
  active: boolean
  disabled?: boolean
  badge?: string
  onClick: () => void
}

const TabBtn = forwardRef<HTMLButtonElement, TabBtnProps>(function TabBtn(
  { label, active, disabled, badge, onClick }, ref
) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className="agent-tab-btn"
      style={{
        padding: '12px 20px',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.1em',
        background: 'none',
        border: 'none',
        borderBottom: '2px solid transparent',
        color: disabled ? 'var(--hair)' : active ? 'var(--fg)' : 'var(--mute)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        marginBottom: -1,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'color 0.2s',
      }}
    >
      {label}
      {badge && (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          padding: '1px 5px',
          background: disabled ? '#1a1a1a' : active ? 'var(--accent)' : 'var(--panel)',
          color: disabled ? 'var(--hair)' : active ? '#000' : 'var(--mute)',
          letterSpacing: '0.04em',
        }}>
          {badge}
        </span>
      )}
    </button>
  )
})

export function AgentTabs({ ticker, tokenId, hasIpo, isRegistered, ipoAddress, inferences, priceUsdc }: Props) {
  const [tab, setTab] = useState<Tab>('call')

  const tabBarRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const contentRef = useRef<HTMLDivElement>(null)
  const pendingTab = useRef<Tab | null>(null)
  const isFirstRender = useRef(true)

  // Set initial indicator position without animation
  useLayoutEffect(() => {
    const activeIndex = TAB_ORDER.indexOf(tab)
    const activeEl = tabRefs.current[activeIndex]
    if (indicatorRef.current && activeEl) {
      gsap.set(indicatorRef.current, { x: activeEl.offsetLeft, width: activeEl.offsetWidth })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Slide indicator when tab changes
  useEffect(() => {
    const activeIndex = TAB_ORDER.indexOf(tab)
    const activeEl = tabRefs.current[activeIndex]
    if (indicatorRef.current && activeEl) {
      gsap.to(indicatorRef.current, {
        x: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        duration: 0.3,
        ease: 'power3.out',
      })
    }
  }, [tab])

  // Re-snap indicator on resize (no animation — snap to avoid stale layout values)
  useEffect(() => {
    const positionIndicator = () => {
      const activeIndex = TAB_ORDER.indexOf(tab)
      const activeEl = tabRefs.current[activeIndex]
      if (indicatorRef.current && activeEl) {
        gsap.set(indicatorRef.current, { x: activeEl.offsetLeft, width: activeEl.offsetWidth })
      }
    }
    let raf = 0
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(positionIndicator) }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(raf) }
  }, [tab])

  // Fade in content when tab changes (skip on mount)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    gsap.fromTo(
      contentRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' }
    )
  }, [tab])

  const switchTab = (newTab: Tab) => {
    if (newTab === tab) return
    if (newTab === 'buy' && (!isRegistered || !hasIpo)) return
    pendingTab.current = newTab
    gsap.to(contentRef.current, {
      opacity: 0,
      y: -8,
      duration: 0.15,
      ease: 'power2.in',
      onComplete: () => setTab(pendingTab.current!),
    })
  }

  return (
    <div>
      {/* Tab bar with sliding red indicator */}
      <div
        ref={tabBarRef}
        className="agent-tab-bar"
        style={{ position: 'relative', display: 'flex', borderBottom: '1px solid var(--hair)', marginBottom: 24 }}
      >
        <span
          ref={indicatorRef}
          style={{
            position: 'absolute', bottom: -1, left: 0, height: 2,
            background: 'var(--accent)', pointerEvents: 'none',
          }}
        />
        <TabBtn
          ref={el => { tabRefs.current[0] = el }}
          label="CALL"
          active={tab === 'call'}
          onClick={() => switchTab('call')}
        />
        <TabBtn
          ref={el => { tabRefs.current[1] = el }}
          label="BUY SHARES"
          active={tab === 'buy'}
          disabled={!isRegistered || !hasIpo}
          badge={hasIpo ? 'IPO OPEN' : 'NO IPO'}
          onClick={() => switchTab('buy')}
        />
      </div>

      {/* Animated content */}
      <div ref={contentRef}>
        {tab === 'call' && (
          <>
            <InferenceBox tokenId={tokenId} ticker={ticker} priceUsdc={priceUsdc} />
            {inferences.length > 0 && (
              <>
                <p className="section-h" style={{ marginTop: 32 }}>Call History</p>
                <div style={{ borderTop: '1px solid var(--hair)' }}>
                  <div style={{ display: 'flex', gap: 40, padding: '6px 0', borderBottom: '1px solid var(--hair)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em', width: 100 }}>TIME</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em' }}>CALLER WALLET</span>
                  </div>
                  {inferences.slice(0, 10).map((inf, i) => (
                    <div
                      key={inf.id || `${inf.subscriber}-${inf.timestamp}-${i}`}
                      style={{ display: 'flex', gap: 40, padding: '10px 0', borderBottom: '1px solid var(--hair-2)', alignItems: 'center' }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mute)', width: 100, flexShrink: 0 }}>{relativeTime(inf.timestamp)}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mute)' }}>{shortAddr(inf.subscriber)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {inferences.length === 0 && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)', marginTop: 20 }}>
                Belum ada yang mencoba — jadilah yang pertama pakai form di atas
              </div>
            )}
          </>
        )}

        {tab === 'buy' && hasIpo && ipoAddress && (
          <BuyTab ipoAddress={ipoAddress} ticker={ticker} />
        )}

      </div>
    </div>
  )
}

// ─── Buy Tab ─────────────────────────────────────────────────────────────────
function BuyTab({ ipoAddress, ticker }: { ipoAddress: Hex; ticker: string }) {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()

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

  const sharesAmount = BigInt(Math.max(0, Math.floor(Number(shares) || 0))) * 10n ** 18n
  const usdcCost = stats ? (sharesAmount * stats.pricePerShare) / 10n ** 18n : 0n
  const priceUsd = stats ? (Number(stats.pricePerShare) / 1e6).toFixed(4) : '...'
  const costUsd = (Number(usdcCost) / 1e6).toFixed(2)
  const availableShares = stats ? Number(stats.available / 10n ** 18n).toLocaleString() : '...'
  const maxShares = stats ? Number(stats.maxShares / 10n ** 18n).toLocaleString() : '...'
  const pctSold = stats
    ? Math.round((Number(stats.maxShares - stats.available) / Number(stats.maxShares)) * 100)
    : null

  const handleBuy = async () => {
    if (!address || sharesAmount === 0n) return
    setBusy(true); setLog(''); setErr('')
    try {
      if (!onZg) { setLog('switching to 0G Mainnet...'); await switchChainAsync({ chainId: ZG_ID }) }
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
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message.slice(0, 200) : String(e))
    } finally { setBusy(false) }
  }

  return (
    <div>
      <div className="r-grid-auto" style={{ gap: 1, background: 'var(--hair)', marginBottom: 24 }}>
        <div className="stat">
          <div className="label">PRICE / SHARE</div>
          <div className="value">{stats ? `$${priceUsd}` : '...'}</div>
          <div className="delta">USDC.e on 0G Mainnet</div>
        </div>
        <div className="stat">
          <div className="label">AVAILABLE</div>
          <div className="value">{availableShares}</div>
          <div className="delta">of {maxShares} total{pctSold !== null ? ` · ${pctSold}% sold` : ''}</div>
        </div>
        <div className="stat">
          <div className="label">STATUS</div>
          <div className="value" style={{ color: stats?.isOpen ? '#22c55e' : '#f59e0b' }}>
            {stats ? (stats.isOpen ? 'OPEN' : 'CLOSED') : '...'}
          </div>
          <div className="delta">IPO window</div>
        </div>
      </div>

      {!isConnected ? (
        <button
          className="btn primary"
          onClick={() => connect({ connector: injected(), chainId: ZG_ID })}
          style={{ width: '100%', cursor: 'pointer', padding: '12px 0', fontSize: 13 }}
        >
          Connect Wallet to Buy
        </button>
      ) : (
        <>
          {/* Order panel */}
          <div style={{ border: '1px solid var(--hair)', background: '#080808', marginBottom: 16, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
              padding: '8px 14px', borderBottom: '1px solid var(--hair)',
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)',
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              How many shares to buy?
            </div>

            {/* Quick-select presets */}
            {(() => {
              const PRESETS = ['10', '100', '1000']
              const activeIdx = PRESETS.indexOf(shares)
              return (
                <div style={{ position: 'relative', display: 'flex', borderBottom: '1px solid var(--hair)' }}>
                  {activeIdx !== -1 && (
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0,
                      width: `${100 / PRESETS.length}%`,
                      transform: `translateX(${activeIdx * 100}%)`,
                      background: 'var(--hair-2)',
                      transition: 'transform 0.25s cubic-bezier(0.24, 1, 0.36, 1)',
                      pointerEvents: 'none',
                    }} />
                  )}
                  {PRESETS.map(preset => (
                    <button
                      key={preset}
                      onClick={() => setShares(preset)}
                      style={{
                        flex: 1, padding: '8px 0', background: 'transparent',
                        fontFamily: 'var(--font-mono)', fontSize: 11,
                        color: shares === preset ? 'var(--fg)' : 'var(--mute)',
                        border: 'none', cursor: 'pointer', letterSpacing: '0.04em',
                        textAlign: 'center', position: 'relative', zIndex: 1,
                        transition: 'color 0.2s',
                      }}
                    >
                      {Number(preset).toLocaleString()}
                    </button>
                  ))}
                </div>
              )
            })()}

            {/* Input */}
            <div style={{ padding: '12px 16px 4px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 6 }}>
                {ticker} SHARES
              </div>
              <input
                value={shares}
                onChange={e => setShares(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                style={{
                  width: '100%', background: 'transparent', border: 'none', outline: 'none',
                  fontFamily: 'var(--font-mono)', fontSize: 28, color: 'var(--fg)',
                  padding: 0,
                }}
                placeholder="0"
              />
            </div>

            {/* Cost summary */}
            <div style={{
              borderTop: '1px solid var(--hair)', padding: '10px 14px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', letterSpacing: '0.06em' }}>
                {shares || '0'} shares × ${priceUsd}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--fg)', fontWeight: 700 }}>
                ${costUsd} <span style={{ fontSize: 10, color: 'var(--mute)', fontWeight: 400 }}>USDC</span>
              </span>
            </div>
          </div>

          <button
            className="btn primary"
            onClick={handleBuy}
            disabled={busy || !stats?.isOpen || sharesAmount === 0n}
            style={{ width: '100%', cursor: (busy || !stats?.isOpen) ? 'not-allowed' : 'pointer', padding: '14px 0', fontSize: 13 }}
          >
            {busy ? '● processing...' : `▸ BUY ${shares || '0'} ${ticker} SHARES`}
          </button>
        </>
      )}

      {log && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: log.startsWith('✓') ? '#22c55e' : 'var(--mute)', marginTop: 14 }}>
          {log}
        </div>
      )}
      {err && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#ef4444', marginTop: 14 }}>
          {err}
        </div>
      )}
    </div>
  )
}

