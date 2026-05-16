'use client'
import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { buildRegisterMessage, registerAgentInBackend, type RegisterEntry } from '@/lib/agents'

interface Props {
  tokenId: number
  ticker: string
  shareToken: string
}

export function RegisterToExchangePanel({ tokenId, ticker, shareToken }: Props) {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('0.10')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  const handleRegister = async () => {
    if (!address) return
    setBusy(true); setErr('')
    try {
      const priceUsdc = String(Math.round(parseFloat(price || '0') * 1_000_000))
      const entry: RegisterEntry = {
        tokenId: String(tokenId),
        ticker: ticker.toUpperCase(),
        name: `${ticker.toUpperCase()} Agent`,
        description: description || ticker.toUpperCase(),
        systemPrompt: `You are ${ticker.toUpperCase()}, an AI agent on Wall of 0Gents.`,
        model: 'google/gemini-2.0-flash-lite-001',
        priceUsdc,
        runtime: '0g-ai',
        shareToken: shareToken || undefined,
      }
      const ts = Date.now()
      const message = buildRegisterMessage(String(tokenId), ticker, ts, entry)
      const signature = await signMessageAsync({ message })
      const res = await registerAgentInBackend(entry, { owner: address, ts, signature })
      if (res.ok) {
        setDone(true)
      } else {
        setErr(res.error ?? 'registration failed')
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message.slice(0, 200) : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#22c55e', padding: '8px 0' }}>
        ✓ Registered — refresh markets to see {ticker}
      </div>
    )
  }

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)} style={{ fontSize: 10, cursor: 'pointer' }}>
        Register to Exchange ▸
      </button>
    )
  }

  return (
    <div style={{ border: '1px solid var(--accent)', padding: 16, marginTop: 12, background: '#080808' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 12 }}>
        REGISTER {ticker.toUpperCase()} TO EXCHANGE
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--mute)', marginBottom: 4 }}>DESCRIPTION</div>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="One-line description shown on markets page"
          style={{
            width: '100%', background: '#030303', border: '1px solid var(--hair)', outline: 'none',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg)',
            padding: '8px 10px', boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--mute)', marginBottom: 4 }}>PRICE PER CALL (USDC)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>$</span>
          <input
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="0.10"
            style={{
              width: 80, background: '#030303', border: '1px solid var(--hair)', outline: 'none',
              fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg)', padding: '8px 10px',
            }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)' }}>USDC / call</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button
          className="btn primary"
          onClick={handleRegister}
          disabled={busy}
          style={{ cursor: busy ? 'wait' : 'pointer', fontSize: 11 }}
        >
          {busy ? '● signing...' : '▸ Sign & Register'}
        </button>
        <button className="btn" onClick={() => setOpen(false)} style={{ cursor: 'pointer', fontSize: 11 }}>
          cancel
        </button>
      </div>

      {err && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#ef4444', marginTop: 6 }}>
          ERROR: {err}
        </div>
      )}
    </div>
  )
}
