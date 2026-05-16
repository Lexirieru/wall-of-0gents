import { http } from 'wagmi'

export const zgChain = {
  id: 16661,
  name: '0G Galileo',
  nativeCurrency: { name: 'A0GI', symbol: 'A0GI', decimals: 18 },
  rpcUrls: { default: { http: ['https://evmrpc.0g.ai'] } },
} as const

export const supportedChains = [zgChain] as const

export const transports = {
  [zgChain.id]: http(),
}
