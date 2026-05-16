'use client'
import { useQuery } from '@tanstack/react-query'
import { http, createPublicClient } from 'viem'
import { zgGalileo } from '@/components/providers/Web3Provider'
import { wallIPOPushAbi } from '@/lib/abis'

const zgClient = createPublicClient({
  chain: { ...zgGalileo, id: zgGalileo.id } as never,
  transport: http('https://evmrpc.0g.ai'),
})

async function fetchIpoSold(ipoAddress: `0x${string}`): Promise<{ sold: bigint; maxShares: bigint }> {
  const [sold, maxShares] = await Promise.all([
    zgClient.readContract({ address: ipoAddress, abi: wallIPOPushAbi, functionName: 'sold' }) as Promise<bigint>,
    zgClient.readContract({ address: ipoAddress, abi: wallIPOPushAbi, functionName: 'maxShares' }) as Promise<bigint>,
  ])
  return { sold, maxShares }
}

export function IpoSold({ ipoAddress }: { ipoAddress: `0x${string}` }) {
  const { data } = useQuery({
    queryKey: ['ipoSold', ipoAddress],
    queryFn: () => fetchIpoSold(ipoAddress),
    refetchInterval: 5_000,
    staleTime: 4_000,
  })

  let display = '—'
  if (data) {
    const sold = Number(data.sold / 10n ** 18n).toLocaleString()
    const max = Number(data.maxShares / 10n ** 18n).toLocaleString()
    const pct = data.maxShares > 0n
      ? (Number(data.sold) / Number(data.maxShares) * 100).toFixed(2)
      : '0.00'
    display = `${sold} / ${max} (${pct}%)`
  }

  return (
    <div className="stat">
      <div className="label">IPO Sold</div>
      <div className="value">{display}</div>
      <div className="delta">public IPO allocation</div>
    </div>
  )
}
