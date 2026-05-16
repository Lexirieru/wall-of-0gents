'use client'

import { createConfig, WagmiProvider, http, createStorage } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

// 0G Mainnet (real USDC.e market). Override RPC via NEXT_PUBLIC_ZG_RPC.
const ZG_RPC = process.env.NEXT_PUBLIC_ZG_RPC ?? 'https://evmrpc.0g.ai'
export const zgGalileo = {
  id: 16661,
  name: '0G Mainnet',
  nativeCurrency: { decimals: 18, name: '0G', symbol: '0G' },
  rpcUrls: { default: { http: [ZG_RPC] } },
  blockExplorers: { default: { name: '0G Explorer', url: 'https://chainscan.0g.ai' } },
  testnet: false,
} as const

export function Web3Provider({ children }: { children: ReactNode }) {
  const [wagmiConfig] = useState(() => createConfig({
    chains: [zgGalileo],
    transports: {
      [zgGalileo.id]: http(ZG_RPC),
    },
    connectors: [injected()],
    ssr: true,
    storage: createStorage({ storage: typeof window !== 'undefined' ? window.localStorage : undefined }),
  }))
  const [queryClient] = useState(() => new QueryClient())
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export const Providers = Web3Provider
