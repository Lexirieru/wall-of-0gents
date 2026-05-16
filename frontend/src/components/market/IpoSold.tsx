'use client'
import { useQuery } from '@tanstack/react-query'
import { zgPublicClient as zgClient } from '@/lib/chain'
import { wallIPOPushAbi } from '@/lib/abis'

async function fetchIpoSold(ipoAddress: `0x${string}`): Promise<{ sold: bigint; maxShares: bigint; endsAt: bigint }> {
  const [sold, maxShares, endsAt] = await Promise.all([
    zgClient.readContract({ address: ipoAddress, abi: wallIPOPushAbi, functionName: 'sold' }) as Promise<bigint>,
    zgClient.readContract({ address: ipoAddress, abi: wallIPOPushAbi, functionName: 'maxShares' }) as Promise<bigint>,
    zgClient.readContract({ address: ipoAddress, abi: wallIPOPushAbi, functionName: 'endsAt' }) as Promise<bigint>,
  ])
  return { sold, maxShares, endsAt }
}

function formatIpoClose(endsAt: bigint): string {
  const ms = Number(endsAt) * 1000
  const now = Date.now()
  if (ms <= now) return 'CLOSED'
  const d = new Date(ms)
  const diff = ms - now
  const daysLeft = Math.ceil(diff / 86_400_000)
  const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `closes ${dateStr} · ${daysLeft}d left`
}

export function IpoSold({ ipoAddress }: { ipoAddress: `0x${string}` }) {
  const { data } = useQuery({
    queryKey: ['ipoSold', ipoAddress],
    queryFn: () => fetchIpoSold(ipoAddress),
    refetchInterval: 5_000,
    staleTime: 4_000,
  })

  let display = '—'
  let closeLine = 'public IPO allocation'
  if (data) {
    const sold = Number(data.sold / 10n ** 18n).toLocaleString()
    const max = Number(data.maxShares / 10n ** 18n).toLocaleString()
    const pct = data.maxShares > 0n
      ? (Number(data.sold) / Number(data.maxShares) * 100).toFixed(2)
      : '0.00'
    display = `${sold} / ${max} (${pct}%)`
    closeLine = formatIpoClose(data.endsAt)
  }

  return (
    <div className="stat">
      <div className="label">IPO Sold</div>
      <div className="value">{display}</div>
      <div className="delta">{closeLine}</div>
    </div>
  )
}
