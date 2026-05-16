import type { Hex } from 'viem'

// ─── Deployed addresses on 0G MAINNET (chainId 16661) ─────────────────────
// `mockUsdc` key kept for call-site compat — value is the REAL USDC.e.
export const CONTRACTS = {
  agentNft:       '0x19f1021fF79B7428D4b5618338B02A20aCaD00b9' as Hex,
  fractionalizer: '0xe5959e5C96348a2275A93630b34cB37571d6C2E7' as Hex,
  registry:       '0xd1Ac9b80A872E8891318A3F6d551055EED399E03' as Hex,
  market:         '0x9B9D66405CDcAdbe5d1F300f67A1F89460e4C364' as Hex,
  mockUsdc:       '0x1f3AA82227281cA364bFb3d253B0f1af1Da6473E' as Hex,
  factory:        '0x61638a3bb5449F6dB92EB9B81d858c96cb09Bf21' as Hex,
} as const

// ─── WallAgentNFT ──────────────────────────────────────────────────────────
export const wallAgentNftAbi = [
  {
    type: 'function', name: 'mint', stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'metadataHash', type: 'bytes32' },
      { name: 'metadataURI', type: 'string' },
      { name: 'sealedKey', type: 'bytes' },
      { name: 'teeAttestation', type: 'bytes' },
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
  {
    type: 'function', name: 'ownerOf', stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function', name: 'approve', stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function', name: 'safeTransferFrom', stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function', name: 'setApprovalForAll', stateMutability: 'nonpayable',
    inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }],
    outputs: [],
  },
  {
    type: 'function', name: 'getApproved', stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'event', name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
  },
] as const

// ─── WallFractionalizer ────────────────────────────────────────────────────
export const wallFractionalizerAbi = [
  {
    type: 'function', name: 'fractionalize', stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'shareName', type: 'string' },
      { name: 'shareSymbol', type: 'string' },
      { name: 'recipient', type: 'address' },
    ],
    outputs: [{ name: 'shareTokenAddr', type: 'address' }],
  },
  {
    type: 'function', name: 'vaults', stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'shareToken', type: 'address' },
      { name: 'creator', type: 'address' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    type: 'function', name: 'redeem', stateMutability: 'nonpayable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'event', name: 'Fractionalized',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'shareToken', type: 'address', indexed: false },
      { name: 'creator', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event', name: 'Redeemed',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'by', type: 'address', indexed: true },
    ],
  },
] as const

// ─── WallRegistry ──────────────────────────────────────────────────────────
export const wallRegistryAbi = [
  {
    type: 'function', name: 'register', stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'shareToken', type: 'address' },
      { name: 'vaultBase', type: 'address' },
      { name: 'ensNameHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function', name: 'info', stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      {
        name: '', type: 'tuple',
        components: [
          { name: 'shareToken', type: 'address' },
          { name: 'vaultBase', type: 'address' },
          { name: 'ensNameHash', type: 'bytes32' },
          { name: 'operator', type: 'address' },
          { name: 'createdAt', type: 'uint64' },
        ],
      },
    ],
  },
  {
    type: 'function', name: 'isRegistered', stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'event', name: 'Registered',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'shareToken', type: 'address', indexed: false },
      { name: 'vaultBase', type: 'address', indexed: false },
      { name: 'ensNameHash', type: 'bytes32', indexed: false },
      { name: 'operator', type: 'address', indexed: false },
    ],
  },
] as const

// ─── WallMarket ────────────────────────────────────────────────────────────
export const wallMarketAbi = [
  {
    type: 'function', name: 'postBid', stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'price', type: 'uint256' },
      { name: 'bidderPubkey', type: 'bytes' },
      { name: 'expiresAt', type: 'uint64' },
    ],
    outputs: [],
  },
  {
    type: 'function', name: 'accept', stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'transferValidityProof', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function', name: 'cancelExpired', stateMutability: 'nonpayable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function', name: 'getBid', stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'bidder', type: 'address' },
      { name: 'price', type: 'uint256' },
      { name: 'expiresAt', type: 'uint64' },
      { name: 'bidderPubkey', type: 'bytes' },
    ],
  },
  {
    type: 'function', name: 'withdrawRefund', stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function', name: 'pendingRefunds', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event', name: 'BidPosted',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'bidder', type: 'address', indexed: true },
      { name: 'price', type: 'uint256', indexed: false },
      { name: 'expiresAt', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event', name: 'Acquired',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'acquirer', type: 'address', indexed: true },
      { name: 'seller', type: 'address', indexed: true },
      { name: 'price', type: 'uint256', indexed: false },
    ],
  },
] as const

// ─── ERC-20 (AgentShare + mockUsdc) ───────────────────────────────────────
export const erc20Abi = [
  {
    type: 'function', name: 'balanceOf', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function', name: 'totalSupply', stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function', name: 'allowance', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function', name: 'approve', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function', name: 'transfer', stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function', name: 'symbol', stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function', name: 'decimals', stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'event', name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const

// ─── WallLaunchFactory ─────────────────────────────────────────────────────
export const wallLaunchFactoryAbi = [
  {
    type: 'function', name: 'launches', stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'shareToken', type: 'address' },
      { name: 'vault', type: 'address' },
      { name: 'ipo', type: 'address' },
      { name: 'creator', type: 'address' },
    ],
  },
  {
    type: 'event', name: 'AgentLaunched',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'shareToken', type: 'address', indexed: false },
      { name: 'vault', type: 'address', indexed: false },
      { name: 'ipo', type: 'address', indexed: false },
    ],
  },
] as const

// ─── WallIPOPush ───────────────────────────────────────────────────────────
export const wallIPOPushAbi = [
  {
    type: 'function', name: 'buy', stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function', name: 'available', stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function', name: 'isOpen', stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function', name: 'pricePerShare', stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function', name: 'maxShares', stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function', name: 'sold', stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function', name: 'beneficiary', stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function', name: 'startsAt', stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'function', name: 'endsAt', stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'event', name: 'Bought',
    inputs: [
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'cost', type: 'uint256', indexed: false },
    ],
  },
] as const
