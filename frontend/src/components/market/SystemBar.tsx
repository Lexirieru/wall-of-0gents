'use client'
import { useEffect, useState } from 'react'
import { formatGwei } from 'viem'
import { zgPublicClient as client } from '@/lib/chain'

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
