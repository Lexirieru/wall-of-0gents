import { createPublicClient, http, type Chain } from 'viem'

// 0G Mainnet (real USDC.e market). Override RPC via NEXT_PUBLIC_ZG_RPC.
const ZG_RPC = process.env.NEXT_PUBLIC_ZG_RPC ?? 'https://evmrpc.0g.ai'

export const zgGalileoChain = {
  id: 16661,
  name: '0G Mainnet',
  nativeCurrency: { decimals: 18, name: '0G', symbol: '0G' },
  rpcUrls: { default: { http: [ZG_RPC] } },
  blockExplorers: { default: { name: '0G Explorer', url: 'https://chainscan.0g.ai' } },
  testnet: false,
} as const satisfies Chain

export const zgPublicClient = createPublicClient({ chain: zgGalileoChain, transport: http(ZG_RPC) })
