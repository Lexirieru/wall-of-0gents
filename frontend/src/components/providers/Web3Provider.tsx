'use client'

import { createConfig, WagmiProvider, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { baseSepolia, mainnet } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

const wagmiConfig = createConfig({
  chains: [baseSepolia, mainnet],
  transports: {
    [baseSepolia.id]: http('https://base-sepolia-rpc.publicnode.com'),
    [mainnet.id]: http(),
  },
  connectors: [injected()],
  ssr: true,
})

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export const Providers = Web3Provider
