'use client'
import { useQuery } from '@tanstack/react-query'
import { zgPublicClient as zgClient } from '@/lib/chain'
import { CONTRACTS, erc20Abi } from '@/lib/abis'

async function fetchVaultBalance(vaultAddress: `0x${string}`): Promise<bigint> {
  try {
    const bal = await zgClient.readContract({
      address: CONTRACTS.mockUsdc,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [vaultAddress],
    })
    return bal as bigint
  } catch {
    return 0n
  }
}

export function VaultBalance({ vaultAddress }: { vaultAddress: `0x${string}` }) {
  const { data: balance = 0n } = useQuery({
    queryKey: ['vaultBalance', vaultAddress],
    queryFn: () => fetchVaultBalance(vaultAddress),
    refetchInterval: 10_000,
    staleTime: 8_000,
  })

  const display = `$${(Number(balance) / 1e6).toFixed(2)}`

  return (
    <div className="stat">
      <div className="label">Vault Balance</div>
      <div className="value">{display}</div>
      <div className="delta">MockUSDC claimable</div>
    </div>
  )
}
