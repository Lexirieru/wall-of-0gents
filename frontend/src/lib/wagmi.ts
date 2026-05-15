import { http } from 'wagmi'
import { mainnet, baseSepolia } from 'wagmi/chains'

export const zgChain = {
  id: 16602,
  name: '0G Galileo',
  nativeCurrency: { name: 'A0GI', symbol: 'A0GI', decimals: 18 },
  rpcUrls: { default: { http: ['https://evmrpc-testnet.0g.ai'] } },
} as const

export const supportedChains = [zgChain, baseSepolia, mainnet] as const

export const transports = {
  [zgChain.id]: http(),
  [baseSepolia.id]: http(),
  [mainnet.id]: http(),
}
