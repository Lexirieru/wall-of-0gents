'use client'
import { useState } from 'react'
import { useAccount } from 'wagmi'

type Props = { tokenId: number; ticker: string }

const OPERATOR_URL = process.env.NEXT_PUBLIC_OPERATOR_URL ?? 'http://127.0.0.1:8402'

export function InferenceBox({ tokenId, ticker }: Props) {
  const { address } = useAccount()
  const [prompt, setPrompt] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    setOutput('')

    try {
      // Use /agents/test route (no payment required for testing)
      const res = await fetch(`${OPERATOR_URL}/agents/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: String(tokenId),
          prompt,
          subscriber: address ?? '0x0000000000000000000000000000000000000001',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'Inference failed')
      } else {
        type InferResult = { choices?: Array<{ message?: { content?: string } }>; result?: string }
        const d = data as InferResult
        const content = d?.choices?.[0]?.message?.content ?? d?.result ?? JSON.stringify(data, null, 2)
        setOutput(content)
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="infer-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {ticker} · Test Inference (no payment)
        </span>
        {!address && (
          <span className="pill warn">Connect wallet for x402</span>
        )}
      </div>
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Enter your prompt..."
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run() }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn primary" onClick={run} disabled={loading}>
          {loading ? 'Running…' : 'Run ▸'}
        </button>
        <button className="btn" onClick={() => { setOutput(''); setError('') }}>Clear</button>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', alignSelf: 'center', marginLeft: 'auto' }}>⌘↵ to run</span>
      </div>
      {error && <div className="output-box" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>{error}</div>}
      {output && <div className="output-box">{output}</div>}
    </div>
  )
}
