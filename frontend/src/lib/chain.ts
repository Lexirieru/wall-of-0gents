import { createPublicClient, http, type Chain } from 'viem'
import { baseSepolia } from 'viem/chains'

export const zgGalileoChain = {
  id: 16602,
  name: '0G Galileo',
  nativeCurrency: { decimals: 18, name: '0G', symbol: '0G' },
  rpcUrls: { default: { http: ['https://evmrpc-testnet.0g.ai'] } },
  blockExplorers: { default: { name: '0G Explorer', url: 'https://chainscan-galileo.0g.ai' } },
  testnet: true,
} as const satisfies Chain

export const zgPublicClient = createPublicClient({ chain: zgGalileoChain, transport: http() })
export const basePublicClient = createPublicClient({ chain: baseSepolia, transport: http('https://base-sepolia-rpc.publicnode.com') })
