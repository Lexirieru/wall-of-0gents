'use client'
import { useEffect, useState } from 'react'
import { createPublicClient, http, formatGwei } from 'viem'

const zgChain = {
  id: 16602,
  name: '0G Galileo',
  nativeCurrency: { decimals: 18, name: '0G', symbol: '0G' },
  rpcUrls: { default: { http: ['https://evmrpc-testnet.0g.ai'] } },
} as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = createPublicClient({ chain: zgChain as any, transport: http() })

export function SystemBar() {
  const [block, setBlock] = useState<string>('—')
  const [gas, setGas] = useState<string>('—')

  useEffect(() => {
    const poll = async () => {
      try {
        const b = await client.getBlockNumber()
        setBlock(b.toLocaleString())
      } catch {}
      try {
        const f = await client.estimateFeesPerGas()
        if (f.maxFeePerGas) setGas(Number(formatGwei(f.maxFeePerGas)).toFixed(2) + ' gwei')
      } catch {}
    }
    poll()
    const id = setInterval(poll, 12000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="ss-bottom">
      <span>0G ▸ block {block}</span>
      <span>gas: {gas}</span>
    </div>
  )
}
