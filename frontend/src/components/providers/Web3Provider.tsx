'use client'

import { createConfig, WagmiProvider, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

export const zgGalileo = {
  id: 16602,
  name: '0G Galileo',
  nativeCurrency: { decimals: 18, name: '0G', symbol: '0G' },
  rpcUrls: { default: { http: ['https://evmrpc-testnet.0g.ai'] } },
  blockExplorers: { default: { name: '0G Explorer', url: 'https://chainscan-galileo.0g.ai' } },
  testnet: true,
} as const

const wagmiConfig = createConfig({
  chains: [zgGalileo],
  transports: {
    [zgGalileo.id]: http('https://evmrpc-testnet.0g.ai'),
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
