'use client'
import { useState } from 'react'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { formatUnits } from 'viem'
import { erc20Abi } from '@/lib/abis'

const OPERATOR_URL = process.env.NEXT_PUBLIC_OPERATOR_URL ?? 'http://127.0.0.1:8402'

type X402Challenge = {
  asset: `0x${string}`
  recipient: `0x${string}`
  minAmount: string
}

type Props = { tokenId: number; ticker: string }

export function InferenceBox({ tokenId, ticker }: Props) {
  const { address } = useAccount()
  const client = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const [prompt, setPrompt] = useState('')
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!prompt.trim()) return
    if (!address) { setError('Connect wallet to run inference'); return }
    if (!client) { setError('No RPC client available'); return }

    setLoading(true)
    setError('')
    setOutput('')
    setStatus('')

    try {
      // 1. Request inference — expect 402 challenge
      setStatus('Getting payment details…')
      const r1 = await fetch(`${OPERATOR_URL}/x402/infer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId: String(tokenId), prompt, subscriber: address }),
      })

      if (r1.status !== 402) {
        const d = await r1.json() as { error?: string }
        setError(d.error ?? `Unexpected status ${r1.status}`)
        return
      }

      const { x402: challenge } = await r1.json() as { x402: X402Challenge }
      const minAmount = BigInt(challenge.minAmount)
      const asset = challenge.asset
      const recipient = challenge.recipient
      const displayAmount = formatUnits(minAmount, 6)

      // 2. Check USDC balance
      setStatus('Checking USDC balance…')
      const balance = await client.readContract({
        address: asset,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      })

      if (balance < minAmount) {
        setError(
          `Insufficient MockUSDC: need ${displayAmount}, have ${formatUnits(balance, 6)}`
        )
        return
      }

      // 3. Send MockUSDC transfer directly to vault
      setStatus(`Sending ${displayAmount} USDC…`)
      const txHash = await writeContractAsync({
        address: asset,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [recipient, minAmount],
      })

      // 4. Wait for on-chain confirmation
      setStatus('Confirming on chain…')
      await client.waitForTransactionReceipt({ hash: txHash })

      // 5. Submit with payment proof
      setStatus('Submitting inference…')
      const r2 = await fetch(`${OPERATOR_URL}/x402/infer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId: String(tokenId), prompt, subscriber: address, txHash }),
      })

      if (r2.status !== 202) {
        const d2 = await r2.json() as { error?: string }
        setError(d2.error ?? 'Payment rejected by operator')
        return
      }

      const { callId } = await r2.json() as { callId: string }

      // 6. Poll for result (max 2 minutes)
      setStatus('Running inference…')
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000))
        const pr = await fetch(`${OPERATOR_URL}/x402/calls/${callId}`)
        const pd = await pr.json() as {
          status: 'pending' | 'done' | 'error'
          result?: { response: string }
          error?: string
        }
        if (pd.status === 'done') {
          const raw = (pd.result?.response ?? '').trimEnd()
          const endsClean = /[.!?)\]"'`]$/.test(raw)
          setOutput(endsClean ? raw : raw + ' …')
          return
        }
        if (pd.status === 'error') {
          setError(pd.error ?? 'Inference failed')
          return
        }
      }
      setError('Inference timed out after 2 minutes')

    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
      setStatus('')
    }
  }

  return (
    <div className="infer-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {ticker} · Inference · Pay with MockUSDC
        </span>
        {!address && (
          <span className="pill warn">Connect wallet to run</span>
        )}
      </div>
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Enter your prompt…"
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void run() }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        <button className="btn primary" onClick={() => void run()} disabled={loading || !address}>
          {loading ? 'Processing…' : 'Run ▸'}
        </button>
        <button
          className="btn"
          onClick={() => { setOutput(''); setError(''); setStatus('') }}
          disabled={loading}
        >
          Clear
        </button>
        {status && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)' }}>
            {status}
          </span>
        )}
      </div>
      {error && (
        <div className="output-box" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
          {error}
        </div>
      )}
      {output && <div className="output-box">{output}</div>}
    </div>
  )
}
