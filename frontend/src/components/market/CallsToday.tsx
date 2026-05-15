'use client'
import { useQuery } from '@tanstack/react-query'

const OPERATOR_URL = process.env.NEXT_PUBLIC_OPERATOR_URL ?? 'http://127.0.0.1:8402'

type Receipt = { tokenId?: number; timestamp?: number; ts?: number }

async function fetchCallsToday(tokenId: number): Promise<number> {
  const res = await fetch(`${OPERATOR_URL}/receipts?tokenId=${tokenId}`, {
    signal: AbortSignal.timeout(4000),
  })
  if (!res.ok) return 0
  const data = await res.json() as Receipt[]
  if (!Array.isArray(data)) return 0
  const cutoff = Date.now() / 1000 - 86400
  return data.filter(r => Number(r.timestamp ?? r.ts ?? 0) > cutoff).length
}

export function CallsToday({ tokenId }: { tokenId: number }) {
  const { data: count = 0 } = useQuery({
    queryKey: ['callsToday', tokenId],
    queryFn: () => fetchCallsToday(tokenId),
    refetchInterval: 10_000,
    staleTime: 8_000,
  })

  return (
    <div className="stat">
      <div className="label">Calls Today</div>
      <div className="value">{count}</div>
      <div className="delta">x402 inference</div>
    </div>
  )
}
