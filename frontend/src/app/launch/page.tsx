'use client'
import Link from 'next/link'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { useAccount, useChainId, useConnect, useWriteContract, useSwitchChain } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { keccak256, toHex, decodeEventLog, encodeAbiParameters, http, createPublicClient } from 'viem'
import { zgGalileo } from '@/components/providers/Web3Provider'
import { CONTRACTS, wallAgentNftAbi, wallLaunchFactoryAbi } from '@/lib/abis'
import { registerAgentInBackend } from '@/lib/agents'

const AGENT_NFT = CONTRACTS.agentNft
const FACTORY   = CONTRACTS.factory
const ZG_ID = zgGalileo.id

const zgClient = createPublicClient({
  chain: { ...zgGalileo, id: ZG_ID } as never,
  transport: http('https://evmrpc-testnet.0g.ai'),
})

// ─── Skill interface ────────────────────────────────────────────────────────
interface Skill {
  id: string
  name: string
  desc: string
}

// ─── Archetypes (Step 01) — 25 total, 9 per page ───────────────────────────
const ARCHETYPES = [
  // Page 1
  {
    id: 'market-analyst', label: 'market-analyst',
    tagline: 'Read the tape. Surface alpha.',
    desc: 'Monitors agent share prices, vault inflows, and inference volume. Posts alpha signals to shareholders as on-chain verifiable receipts.',
    tools: ['ONCHAIN_READ', 'RECALL', 'NOTE', 'QUERY_AGENT'],
    toolCount: 4, skillCount: 0, patternCount: 2,
  },
  {
    id: 'defi-quant', label: 'defi-quant',
    tagline: 'Runs yield strategies on demand.',
    desc: 'Executes DeFi position management and yield optimization via x402. Returns structured trade data. Plugs into agent portfolios seamlessly.',
    tools: ['FETCH_URL', 'ONCHAIN_READ', 'PARSE_AST', 'NOTE'],
    toolCount: 4, skillCount: 1, patternCount: 0,
  },
  {
    id: 'chain-oracle', label: 'chain-oracle',
    tagline: 'The truth machine. Priced per call.',
    desc: 'Answers on-chain data queries over x402. Built to be called by other agents and smart contracts as a trustless, receipt-bearing data source.',
    tools: ['ONCHAIN_READ', 'FETCH_URL', 'QUERY_AGENT', 'NOTE'],
    toolCount: 4, skillCount: 0, patternCount: 3,
  },
  {
    id: 'arbitrage-finder', label: 'arbitrage-finder',
    tagline: 'Finds the spread before anyone else.',
    desc: 'Scans price discrepancies across DEXs and bridges. Returns executable arb paths with expected slippage and estimated execution cost.',
    tools: ['FETCH_URL', 'ONCHAIN_READ', 'PARSE_AST', 'NOTE'],
    toolCount: 4, skillCount: 1, patternCount: 2,
  },
  {
    id: 'portfolio-sentinel', label: 'portfolio-sentinel',
    tagline: 'Watchdog for your shareholders.',
    desc: 'Monitors wallet and agent positions. Fires on-chain alerts when thresholds breach. Every event logged to 0G Storage with tamper-proof receipts.',
    tools: ['ONCHAIN_READ', 'RECALL', 'NOTE'],
    toolCount: 3, skillCount: 2, patternCount: 1,
  },
  {
    id: 'risk-monitor', label: 'risk-monitor',
    tagline: 'Catch the blow-up before it blows.',
    desc: 'Tracks protocol health, liquidation risks, and TVL changes in real time. Fires on-chain alerts and logs risk scores per block height.',
    tools: ['ONCHAIN_READ', 'FETCH_URL', 'RECALL', 'NOTE'],
    toolCount: 4, skillCount: 0, patternCount: 3,
  },
  {
    id: 'whale-tracker', label: 'whale-tracker',
    tagline: 'Follow the smart money on-chain.',
    desc: 'Maps large wallet movements and correlates them with price action. Each receipt includes labeled wallet attribution and capital flow direction.',
    tools: ['ONCHAIN_READ', 'RECALL', 'NOTE', 'QUERY_AGENT'],
    toolCount: 4, skillCount: 2, patternCount: 1,
  },
  {
    id: 'alpha-scout', label: 'alpha-scout',
    tagline: 'Compounds research over time.',
    desc: 'Scrapes public data sources, synthesizes research briefs on demand. Memory persists across calls — compounds knowledge into a proprietary edge.',
    tools: ['FETCH_URL', 'RECALL', 'NOTE', 'QUERY_AGENT'],
    toolCount: 4, skillCount: 0, patternCount: 4,
  },
  {
    id: 'dao-analyst', label: 'dao-analyst',
    tagline: 'Governance alpha, delivered on-chain.',
    desc: 'Monitors DAO proposals, voting patterns, and treasury movements. Compiles shareholder-facing governance digests with protocol impact scores.',
    tools: ['FETCH_URL', 'ONCHAIN_READ', 'RECALL', 'NOTE'],
    toolCount: 4, skillCount: 0, patternCount: 2,
  },
  // Page 2
  {
    id: 'sentiment-trader', label: 'sentiment-trader',
    tagline: 'Contrarian signals from crowd noise.',
    desc: 'Parses social sentiment, news feeds, and on-chain activity to generate contrarian trade signals scored by confidence and historical accuracy.',
    tools: ['FETCH_URL', 'RECALL', 'PARSE_AST', 'NOTE'],
    toolCount: 4, skillCount: 1, patternCount: 3,
  },
  {
    id: 'liquidation-hunter', label: 'liquidation-hunter',
    tagline: 'Spot the cascade before it cascades.',
    desc: 'Scans all leveraged positions approaching liquidation thresholds across lending protocols. Surfaces high-probability cascade events in real time.',
    tools: ['ONCHAIN_READ', 'FETCH_URL', 'NOTE'],
    toolCount: 3, skillCount: 0, patternCount: 2,
  },
  {
    id: 'yield-optimizer', label: 'yield-optimizer',
    tagline: 'Auto-compounds across every protocol.',
    desc: 'Continuously rebalances liquidity across lending and LP protocols to maximize APY. Posts rebalance receipts on-chain after every cycle.',
    tools: ['FETCH_URL', 'ONCHAIN_READ', 'PARSE_AST', 'NOTE'],
    toolCount: 4, skillCount: 2, patternCount: 1,
  },
  {
    id: 'token-screener', label: 'token-screener',
    tagline: 'Score launches before they launch.',
    desc: 'Evaluates new token deployments against rug-pull indicators, tokenomics health, and distribution fairness. Returns risk score and full breakdown.',
    tools: ['ONCHAIN_READ', 'FETCH_URL', 'PARSE_AST', 'NOTE'],
    toolCount: 4, skillCount: 0, patternCount: 3,
  },
  {
    id: 'mev-analyst', label: 'mev-analyst',
    tagline: "See who's front-running the block.",
    desc: 'Tracks MEV extraction across validators and block builders. Surfaces sandwich attacks, frontrun events, and builder concentration risk.',
    tools: ['ONCHAIN_READ', 'RECALL', 'PARSE_AST', 'NOTE'],
    toolCount: 4, skillCount: 1, patternCount: 2,
  },
  {
    id: 'nft-appraiser', label: 'nft-appraiser',
    tagline: 'Fair value, on-chain and on-demand.',
    desc: 'Values NFT collections using floor trends, rarity metrics, and wash-trading filters. Returns a confidence-scored appraisal per call.',
    tools: ['ONCHAIN_READ', 'FETCH_URL', 'RECALL', 'NOTE'],
    toolCount: 4, skillCount: 0, patternCount: 2,
  },
  {
    id: 'earnings-reporter', label: 'earnings-reporter',
    tagline: 'Protocol P&L, filed on-chain.',
    desc: 'Aggregates on-chain protocol revenue, fee data, and shareholder yield metrics. Generates structured periodic reports posted as verifiable receipts.',
    tools: ['ONCHAIN_READ', 'RECALL', 'NOTE'],
    toolCount: 3, skillCount: 1, patternCount: 2,
  },
  {
    id: 'funding-rate-arb', label: 'funding-rate-arb',
    tagline: 'Delta-neutral yield from perp funding.',
    desc: 'Monitors perp funding rates across exchanges. Identifies delta-neutral funding harvest opportunities and returns net yield estimates per trade.',
    tools: ['FETCH_URL', 'ONCHAIN_READ', 'PARSE_AST', 'NOTE'],
    toolCount: 4, skillCount: 1, patternCount: 1,
  },
  // Page 3
  {
    id: 'volatility-surface', label: 'volatility-surface',
    tagline: 'Greeks on-chain, priced per strike.',
    desc: 'Computes implied volatility surfaces from on-chain options data. Returns Greeks and key strike levels for structured products and hedging.',
    tools: ['ONCHAIN_READ', 'FETCH_URL', 'PARSE_AST', 'NOTE'],
    toolCount: 4, skillCount: 0, patternCount: 2,
  },
  {
    id: 'macro-scanner', label: 'macro-scanner',
    tagline: 'Regime change signals, on-chain first.',
    desc: 'Correlates on-chain metrics with macro indicators. Generates regime-change signals for crypto-native portfolios before TradFi catches up.',
    tools: ['FETCH_URL', 'RECALL', 'NOTE', 'QUERY_AGENT'],
    toolCount: 4, skillCount: 0, patternCount: 3,
  },
  {
    id: 'insider-tracker', label: 'insider-tracker',
    tagline: 'Unusual accumulation before the news.',
    desc: 'Flags anomalous token accumulation patterns ahead of major announcements. Cross-references with governance votes and wallet history.',
    tools: ['ONCHAIN_READ', 'RECALL', 'PARSE_AST', 'NOTE'],
    toolCount: 4, skillCount: 1, patternCount: 2,
  },
  {
    id: 'gas-forecaster', label: 'gas-forecaster',
    tagline: 'Submit in the window, not the wall.',
    desc: 'Predicts gas price windows using mempool depth, block utilization trends, and historical EIP-1559 base fee patterns. Returns optimal submission times.',
    tools: ['ONCHAIN_READ', 'FETCH_URL', 'RECALL', 'NOTE'],
    toolCount: 4, skillCount: 0, patternCount: 2,
  },
  {
    id: 'stablecoin-monitor', label: 'stablecoin-monitor',
    tagline: 'Watch the peg before it breaks.',
    desc: 'Monitors depeg risk indicators across stablecoin protocols in real time. Fires on-chain alerts and posts collateral health scores per block.',
    tools: ['ONCHAIN_READ', 'FETCH_URL', 'RECALL', 'NOTE'],
    toolCount: 4, skillCount: 0, patternCount: 3,
  },
  {
    id: 'protocol-auditor', label: 'protocol-auditor',
    tagline: 'Pattern-match exploits before they land.',
    desc: 'Runs known exploit signature patterns against deployed contracts. Returns a risk score per address with annotated vulnerability flags.',
    tools: ['ONCHAIN_READ', 'FETCH_URL', 'PARSE_AST', 'NOTE'],
    toolCount: 4, skillCount: 2, patternCount: 5,
  },
  {
    id: 'shareholder-digest', label: 'shareholder-digest',
    tagline: 'The weekly letter, written on-chain.',
    desc: 'Aggregates agent performance — calls, revenue, vault balance, shareholder yield — into a concise weekly digest posted as a verifiable receipt.',
    tools: ['ONCHAIN_READ', 'RECALL', 'NOTE'],
    toolCount: 3, skillCount: 1, patternCount: 1,
  },
  {
    id: 'cross-chain-router', label: 'cross-chain-router',
    tagline: 'Best route, lowest cost, every time.',
    desc: 'Monitors bridge liquidity and fee structures across L1/L2 networks. Returns optimal cross-chain execution paths scored by cost and finality time.',
    tools: ['FETCH_URL', 'ONCHAIN_READ', 'PARSE_AST', 'NOTE'],
    toolCount: 4, skillCount: 1, patternCount: 2,
  },
]

const PAGE_SIZE = 9

type WizStep = 'archetype' | 'identity' | 'review' | 'list'

const STEPS: { id: WizStep; num: string; label: string }[] = [
  { id: 'archetype', num: '01', label: 'ARCHETYPE' },
  { id: 'identity',  num: '02', label: 'IDENTITY' },
  { id: 'review',   num: '03', label: 'REVIEW · MINT' },
  { id: 'list',     num: '04', label: 'LIST' },
]

// ─── Helper: default system prompt ─────────────────────────────────────────
function defaultSystemPrompt(ticker: string, archetype: typeof ARCHETYPES[0]): string {
  return `You are ${ticker || 'AGENT'}, a permissionless AI agent on Wall of 0Gents.\n\n${archetype.tagline}\n\n${archetype.desc}\n\nYou operate autonomously via x402 micropayments on 0G Galileo. Every inference call generates a verifiable on-chain receipt signed by the operator.`
}

// ─── Step indicator bar ────────────────────────────────────────────────────
function StepBar({ current, completed }: { current: WizStep; completed: Set<WizStep> }) {
  const idx = STEPS.findIndex(s => s.id === current)
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--hair)', marginBottom: 40 }}>
      {STEPS.map((s, i) => {
        const isCurrent = s.id === current
        const isDone = completed.has(s.id)
        return (
          <div
            key={s.id}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderBottom: isCurrent ? '2px solid var(--accent)' : '2px solid transparent',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.08em',
              color: isCurrent ? 'var(--fg)' : isDone ? 'var(--mute)' : 'var(--hair)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ color: isCurrent ? 'var(--accent)' : isDone ? 'var(--mute)' : 'var(--hair)' }}>
              {isDone ? '✓' : s.num}
            </span>
            {s.label}
            {i < STEPS.length - 1 && (
              <span style={{ marginLeft: 'auto', color: i < idx ? 'var(--hair)' : 'var(--hair)' }}>─</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Inline nav buttons ─────────────────────────────────────────────────────
function NavButtons({
  selected, onBack, onContinue, continueLabel, disabled, busy,
}: {
  selected?: string | null
  onBack?: () => void
  onContinue?: () => void
  continueLabel?: string
  disabled?: boolean
  busy?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--hair)' }}>
      {selected && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)' }}>
          <span style={{ color: 'var(--accent)' }}>▌</span> {selected}
        </span>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        {onBack && (
          <button onClick={onBack} className="btn" style={{ cursor: 'pointer', fontSize: 11 }}>
            ← back
          </button>
        )}
        {onContinue && (
          <button
            onClick={onContinue}
            className="btn primary"
            disabled={disabled || busy}
            style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontSize: 11 }}
          >
            {busy ? '● working...' : (continueLabel ?? 'continue →')}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Step 01: Archetype ─────────────────────────────────────────────────────
function ArchetypeStep({
  selected, onSelect, onContinue,
}: {
  selected: string | null
  onSelect: (id: string) => void
  onContinue: () => void
}) {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(ARCHETYPES.length / PAGE_SIZE)
  const visible = ARCHETYPES.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color: 'var(--fg)', margin: '0 0 8px' }}>
          pick a strategy archetype<span style={{ color: 'var(--accent)', animation: 'blink 1s step-end infinite' }}>█</span>
        </h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mute)', margin: 0 }}>
            each archetype ships with pre-wired tools. you'll customize the prompt and pricing in step 02.
          </p>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', whiteSpace: 'nowrap', marginLeft: 16 }}>
            {ARCHETYPES.length} ARCHETYPES · CLONE &amp; CUSTOMIZE AFTER MINT
          </span>
        </div>
      </div>

      {/* Page indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          style={{ background: 'none', border: '1px solid var(--hair)', color: page === 0 ? 'var(--hair)' : 'var(--mute)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '4px 10px', cursor: page === 0 ? 'default' : 'pointer' }}
        >
          ← prev
        </button>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)' }}>
          page {page + 1} / {totalPages} · showing {visible.length} of {ARCHETYPES.length}
        </span>
        <button
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page === totalPages - 1}
          style={{ background: 'none', border: '1px solid var(--hair)', color: page === totalPages - 1 ? 'var(--hair)' : 'var(--mute)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '4px 10px', cursor: page === totalPages - 1 ? 'default' : 'pointer' }}
        >
          next →
        </button>
        {selected && (
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)' }}>
            ✓ {selected}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--hair)' }}>
        {visible.map(a => {
          const isSelected = selected === a.id
          return (
            <div
              key={a.id}
              onClick={() => onSelect(a.id)}
              style={{
                background: isSelected ? '#0d0d0d' : 'var(--panel)',
                border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                padding: 20,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                position: 'relative',
                transition: 'border-color 0.15s',
              }}
            >
              {isSelected && (
                <span style={{
                  position: 'absolute', top: 8, right: 8,
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  color: 'var(--accent)', letterSpacing: '0.08em',
                }}>SELECTED</span>
              )}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: isSelected ? 'var(--fg)' : 'var(--fg-2)' }}>
                {a.label}
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)', lineHeight: 1.55, margin: 0, flexGrow: 1 }}>
                {a.desc}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {a.tools.map(t => (
                  <span key={t} className="pill" style={{ fontSize: 9, padding: '2px 6px' }}>{t}</span>
                ))}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', borderTop: '1px solid var(--hair)', paddingTop: 8 }}>
                {a.toolCount} tools · {a.skillCount} skills · {a.patternCount} patterns
              </div>
            </div>
          )
        })}
      </div>

      <NavButtons
        selected={selected}
        onContinue={selected ? onContinue : undefined}
        continueLabel="continue to identity →"
        disabled={!selected}
      />
    </div>
  )
}

// ─── Step 02: Identity ──────────────────────────────────────────────────────
function IdentityStep({
  archetypeId, ticker, setTicker, description, setDescription,
  price, setPrice, operatorUrl, setOperatorUrl,
  runtime, setRuntime,
  systemPrompt, setSystemPrompt,
  skills, setSkills,
  onBack, onContinue,
}: {
  archetypeId: string
  ticker: string; setTicker: (v: string) => void
  description: string; setDescription: (v: string) => void
  price: string; setPrice: (v: string) => void
  operatorUrl: string; setOperatorUrl: (v: string) => void
  runtime: string; setRuntime: (v: string) => void
  systemPrompt: string; setSystemPrompt: (v: string) => void
  skills: Skill[]; setSkills: (v: Skill[]) => void
  onBack: () => void; onContinue: () => void
}) {
  const archetype = ARCHETYPES.find(a => a.id === archetypeId)!
  const canContinue = ticker.length >= 2 && ticker.length <= 6

  const [promptOpen, setPromptOpen] = useState(false)
  const [skillsOpen, setSkillsOpen] = useState(false)

  const promptBodyRef = useRef<HTMLDivElement>(null)
  const skillsBodyRef = useRef<HTMLDivElement>(null)

  const animateSection = useCallback((el: HTMLElement | null, open: boolean) => {
    if (!el) return
    if (open) {
      el.style.overflow = 'hidden'
      el.style.height = 'auto'
      const h = el.scrollHeight
      el.style.height = '0px'
      gsap.to(el, {
        height: h, duration: 0.38, ease: 'power3.out',
        onComplete: () => { el.style.height = 'auto'; el.style.overflow = '' },
      })
    } else {
      el.style.overflow = 'hidden'
      gsap.to(el, { height: 0, duration: 0.26, ease: 'power3.in' })
    }
  }, [])

  useEffect(() => { animateSection(promptBodyRef.current, promptOpen) }, [promptOpen, animateSection])
  useEffect(() => { animateSection(skillsBodyRef.current, skillsOpen) }, [skillsOpen, animateSection])

  useEffect(() => {
    if (promptBodyRef.current) { promptBodyRef.current.style.height = '0px'; promptBodyRef.current.style.overflow = 'hidden' }
    if (skillsBodyRef.current) { skillsBodyRef.current.style.height = '0px'; skillsBodyRef.current.style.overflow = 'hidden' }
  }, [])

  useEffect(() => {
    if (!systemPrompt) {
      setSystemPrompt(defaultSystemPrompt(ticker, archetype))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const manifestPreview = useMemo(() => [
    ['ticker', ticker ? `${ticker.toUpperCase()}.wall.eth` : '—'],
    ['archetype', archetypeId],
    ['price', price ? `$${price} USDC / call` : '—'],
    ['runtime', runtime],
    ['chain', '0G Galileo (16602)'],
    ['─ tools', `(${archetype.toolCount})`],
    ...archetype.tools.map(t => [`  › ${t.toLowerCase()}`, '']),
    ['─ artifacts', ''],
    ['  manifest hash', '(computed at mint)'],
    ['  token id', '(at mint time)'],
    ['  ens record', 'pending registration'],
  ], [ticker, archetypeId, price, runtime, archetype])

  const addSkill = () => {
    setSkills([...skills, { id: String(Date.now()), name: '', desc: '' }])
  }

  const removeSkill = (id: string) => {
    setSkills(skills.filter(s => s.id !== id))
  }

  const updateSkill = (id: string, field: 'name' | 'desc', value: string) => {
    setSkills(skills.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const COMPUTE_OPTIONS = [
    {
      id: '0g-ai',
      label: '0G COMPUTE',
      badge: 'TEE',
      desc: 'Runs directly on 0G Galileo inside a secure enclave. Responses are signed on-chain so anyone can verify the agent wasn\'t tampered with.',
    },
    {
      id: 'venice',
      label: 'VENICE',
      badge: 'HOSTED',
      desc: 'Routes through Venice — pick from qwen, claude, llama, gemma and more. Faster to set up, lower cost per call. No on-chain signing.',
    },
  ]

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Top two-column area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, marginBottom: 28 }}>
        {/* Left: form */}
        <div>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color: 'var(--fg)', margin: '0 0 28px' }}>
            define your agent
          </h1>

          {/* Ticker */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em', marginBottom: 8 }}>
              TICKER · MAX 6 CHARS
            </div>
            <div style={{ display: 'flex', border: '1px solid var(--hair)', background: '#080808' }}>
              <input
                value={ticker}
                onChange={e => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="WAGNT"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700,
                  color: 'var(--fg)', padding: '12px 14px',
                }}
              />
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mute)',
                padding: '12px 14px', borderLeft: '1px solid var(--hair)',
              }}>
                .wall.eth
              </span>
            </div>
            {ticker.length >= 2 ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#22c55e', marginTop: 4 }}>
                ✓ available · resolves to 0G chain id {ZG_ID}
              </div>
            ) : ticker.length > 0 ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#ef4444', marginTop: 4 }}>
                min 2 characters
              </div>
            ) : null}
          </div>

          {/* Description */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em', marginBottom: 8 }}>
              ONE-LINE PITCH · SHOWN ON MARKETS
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 200))}
              placeholder={archetype.tagline}
              rows={2}
              style={{
                width: '100%', background: '#080808', border: '1px solid var(--hair)',
                outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 13,
                color: 'var(--fg)', padding: '12px 14px', resize: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', textAlign: 'right' }}>
              {description.length}/200 chars
            </div>
          </div>

          {/* Price */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em', marginBottom: 8 }}>
              PER-CALL PRICE
            </div>
            <div style={{ display: 'flex', border: '1px solid var(--hair)', background: '#080808', width: 200 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent)', padding: '12px 12px' }}>$</span>
              <input
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0.10"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--fg)', padding: '12px 0',
                }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)', padding: '12px 12px', borderLeft: '1px solid var(--hair)' }}>
                USDC
              </span>
            </div>
            {price && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', marginTop: 4 }}>
              shareholders receive ${price} per inference call
            </div>}
          </div>

          {/* Operator URL */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em', marginBottom: 8 }}>
              OPERATOR ENDPOINT <span style={{ color: 'var(--hair)' }}>· OPTIONAL</span>
            </div>
            <input
              value={operatorUrl}
              onChange={e => setOperatorUrl(e.target.value)}
              placeholder="https://my-agent.example.com"
              style={{
                width: '100%', background: '#080808', border: '1px solid var(--hair)',
                outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 13,
                color: 'var(--fg)', padding: '12px 14px', boxSizing: 'border-box',
              }}
            />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', marginTop: 4 }}>
              x402 inference payments routed here after listing
            </div>
          </div>
        </div>

        {/* Right: live manifest preview */}
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            manifest · live preview
            <span style={{ color: 'var(--accent)', fontSize: 9 }}>BUILDING</span>
          </div>
          <div style={{ background: '#030303', border: '1px solid var(--hair)', padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.7, color: 'var(--mute)' }}>
            <div style={{ color: 'var(--fg-2)', marginBottom: 4 }}>agent.manifest ─────────────────</div>
            {manifestPreview.map(([k, v], i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: k.startsWith('─') || k.startsWith('  ') ? 'var(--mute)' : 'var(--mute)', minWidth: 120 }}>{k}</span>
                {v && <span style={{ color: k.includes('ticker') || k.includes('hash') || k.includes('token') ? 'var(--fg)' : 'var(--mute)' }}>{v}</span>}
              </div>
            ))}
            <div style={{ marginTop: 8, color: 'var(--hair)', fontSize: 9 }}>
              live · recomputes on every keystroke
              {ticker.length >= 2 && (
                <span style={{ color: 'var(--accent)', marginLeft: 8 }}>● manifest valid</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── EXECUTION NODE ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em' }}>WHERE DOES IT RUN?</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {COMPUTE_OPTIONS.map(opt => {
            const isSelected = runtime === opt.id
            return (
              <div
                key={opt.id}
                onClick={() => setRuntime(opt.id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setRuntime(opt.id)}
                style={{
                  background: isSelected ? '#05080d' : '#070707',
                  border: isSelected ? '1px solid var(--accent)' : '1px solid var(--hair)',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  transition: 'border-color 0.18s, background 0.18s',
                  position: 'relative',
                }}
              >
                {isSelected && (
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: 'var(--accent)' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                    color: isSelected ? 'var(--fg)' : 'var(--fg-2)',
                  }}>
                    {opt.label}
                  </span>
                  <span style={{
                    marginLeft: 'auto',
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em',
                    padding: '2px 7px',
                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--hair)'}`,
                    color: isSelected ? 'var(--accent)' : 'var(--mute)',
                  }}>
                    {opt.badge}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', margin: 0, lineHeight: 1.65 }}>
                  {opt.desc}
                </p>
                {isSelected && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--accent)', letterSpacing: '0.06em' }}>
                    ● SELECTED
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── DIRECTIVE FILE ── */}
      <div style={{ marginBottom: 20, border: '1px solid var(--hair)' }}>
        <div
          onClick={() => setPromptOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', cursor: 'pointer',
            background: '#070707',
            userSelect: 'none',
          }}
        >
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)',
            transition: 'transform 0.25s ease',
            display: 'inline-block',
            transform: promptOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          }}>▶</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg)', letterSpacing: '0.06em' }}>
            system prompt
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--mute)', letterSpacing: '0.05em', padding: '1px 6px', border: '1px solid var(--hair)' }}>
            {systemPrompt.length > 0 ? `${systemPrompt.length} chars` : 'empty'}
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--hair)', letterSpacing: '0.08em' }}>
            {promptOpen ? 'collapse' : 'expand'}
          </span>
        </div>
        <div ref={promptBodyRef}>
          <div style={{ borderTop: '1px solid var(--hair)', padding: 14 }}>
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              style={{
                width: '100%', minHeight: 180, background: '#030303',
                border: '1px solid var(--hair)', outline: 'none',
                fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg)',
                padding: '12px 14px', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.7,
              }}
            />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--hair)', marginTop: 6 }}>
              this is what your agent says to itself before every call
            </div>
          </div>
        </div>
      </div>

      {/* ── MODULE REGISTRY ── */}
      <div style={{ marginBottom: 28, border: '1px solid var(--hair)' }}>
        <div
          onClick={() => setSkillsOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', cursor: 'pointer',
            background: '#070707',
            userSelect: 'none',
          }}
        >
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)',
            transition: 'transform 0.25s ease',
            display: 'inline-block',
            transform: skillsOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          }}>▶</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg)', letterSpacing: '0.06em' }}>
            skills
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--mute)', letterSpacing: '0.05em', padding: '1px 6px', border: '1px solid var(--hair)' }}>
            {skills.length === 0 ? 'none added' : `${skills.length} added`}
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--hair)', letterSpacing: '0.08em' }}>
            {skillsOpen ? 'collapse' : 'expand'}
          </span>
        </div>
        <div ref={skillsBodyRef}>
          <div style={{ borderTop: '1px solid var(--hair)', padding: 14 }}>
            {skills.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--hair)', marginBottom: 14, lineHeight: 1.6 }}>
                no skills yet. add things your agent knows how to do — each one gets listed in the manifest.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {skills.map((skill, idx) => (
                  <div key={skill.id} style={{ border: '1px solid var(--hair)', background: '#030303' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--hair)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--hair)', minWidth: 20 }}>
                        [{String(idx).padStart(2, '0')}]
                      </span>
                      <input
                        value={skill.name}
                        onChange={e => updateSkill(skill.id, 'name', e.target.value)}
                        placeholder="skill name"
                        style={{
                          flex: 1, background: 'transparent', border: 'none', outline: 'none',
                          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg)', padding: 0,
                        }}
                      />
                      <button
                        onClick={() => removeSkill(skill.id)}
                        style={{
                          background: 'transparent', border: 'none', color: '#555',
                          fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer', padding: '0 4px',
                        }}
                        title="uninstall module"
                      >
                        ✕
                      </button>
                    </div>
                    <textarea
                      value={skill.desc}
                      onChange={e => updateSkill(skill.id, 'desc', e.target.value)}
                      placeholder="describe module behavior..."
                      rows={2}
                      style={{
                        width: '100%', background: 'transparent', border: 'none',
                        outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 10,
                        color: 'var(--mute)', padding: '10px 12px', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6,
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addSkill} className="btn" style={{ cursor: 'pointer', fontSize: 10, letterSpacing: '0.06em' }}>
                + add skill
              </button>
              {skills.length > 0 && (
                <button
                  onClick={() => setSkills([])}
                  style={{
                    background: 'transparent', border: '1px solid var(--hair)', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--hair)', padding: '6px 12px',
                    letterSpacing: '0.06em',
                  }}
                >
                  clear all
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--hair)', marginBottom: 8 }}>
        everything above gets bundled and saved on-chain when you mint
      </div>

      <NavButtons
        onBack={onBack}
        onContinue={canContinue ? onContinue : undefined}
        continueLabel="continue to review →"
        disabled={!canContinue}
      />
    </div>
  )
}

// ─── Step 03: Review + Mint ─────────────────────────────────────────────────
function ReviewStep({
  ticker, archetypeId, price, operatorUrl,
  onBack, onMinted,
}: {
  ticker: string; archetypeId: string; price: string; operatorUrl: string
  onBack: () => void; onMinted: (tokenId: string, hash: string) => void
}) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { connect } = useConnect()
  const { switchChain } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const archetype = ARCHETYPES.find(a => a.id === archetypeId)!
  const onZg = chainId === ZG_ID

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const log = (txt: string) => setLogs(p => [...p, txt])

  const metadata = useMemo(() => ({
    ticker: ticker.toUpperCase(),
    archetype: archetypeId,
    description: `${archetype.tagline}`,
    operatorUrl: operatorUrl || null,
    price: price,
    mintedAt: Date.now(),
  }), [ticker, archetypeId, price, operatorUrl, archetype.tagline])

  const metadataURI = JSON.stringify(metadata)
  const metadataHash = useMemo(() => keccak256(toHex(metadataURI)) as `0x${string}`, [metadataURI])

  const handleMint = async () => {
    if (!address) return
    setBusy(true); setErr(null); setLogs([])

    try {
      if (!onZg) {
        log('[chain] switching to 0G Galileo...')
        await switchChain({ chainId: ZG_ID })
        log('[chain] switched ✓')
      }
      log(`[manifest] hash: ${metadataHash.slice(0, 20)}...`)
      log('[tx] calling WallAgentNFT.mint() ...')

      const hash = await writeContractAsync({
        address: AGENT_NFT,
        abi: wallAgentNftAbi,
        functionName: 'mint',
        args: [address, metadataHash, metadataURI, '0x', '0x'],
        chainId: ZG_ID,
      })

      log(`[tx] submitted: ${hash.slice(0, 22)}...`)
      log('[tx] waiting for confirmation on 0G Galileo...')

      let rec = null
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 3000))
        try { rec = await zgClient.getTransactionReceipt({ hash }); if (rec) break } catch {}
      }

      if (!rec) { setErr('tx confirmation timed out'); setBusy(false); return }

      let tokenId = '?'
      for (const evLog of rec.logs) {
        try {
          const decoded = decodeEventLog({ abi: wallAgentNftAbi, ...evLog })
          if (decoded.eventName === 'Transfer' && decoded.args.to === address) {
            tokenId = String(decoded.args.tokenId)
          }
        } catch {}
      }

      log(`[mint] success ✓ — Token ID: #${tokenId}`)
      log(`[explorer] https://chainscan-galileo.0g.ai/tx/${hash}`)
      onMinted(tokenId, hash)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message.slice(0, 200) : String(e))
    } finally {
      setBusy(false)
    }
  }

  const summaryRows = [
    ['TICKER', `${ticker.toUpperCase()}.wall.eth`],
    ['ARCHETYPE', archetypeId],
    ['TOOLS', archetype.tools.join(', ')],
    ['PRICE', price ? `$${price} USDC / call` : '—'],
    ['OPERATOR', operatorUrl || '(not set)'],
    ['CHAIN', '0G Galileo Testnet (16602)'],
    ['CONTRACT', `${AGENT_NFT.slice(0, 10)}…${AGENT_NFT.slice(-8)}`],
    ['SEALED_KEY', '0x (TEE optional on testnet)'],
    ['MANIFEST HASH', `${metadataHash.slice(0, 22)}…`],
  ]

  return (
    <div style={{ maxWidth: 680, paddingBottom: 100 }}>
      <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color: 'var(--fg)', margin: '0 0 8px' }}>
        sign & seal on 0G
      </h1>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mute)', margin: '0 0 28px', lineHeight: 1.6 }}>
        review the manifest before minting. once on-chain, the ticker and archetype are permanent.
      </p>

      <div className="panel" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--hair)', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em' }}>
          AGENT MANIFEST
        </div>
        {summaryRows.map(([k, v]) => (
          <div key={k} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--hair)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <div style={{ padding: '10px 16px', color: 'var(--mute)', borderRight: '1px solid var(--hair)', fontSize: 10, letterSpacing: '0.06em' }}>{k}</div>
            <div style={{ padding: '10px 16px', color: 'var(--fg)' }}>{v}</div>
          </div>
        ))}
      </div>

      {!isConnected ? (
        <div style={{ marginBottom: 16 }}>
          <button className="btn primary" onClick={() => connect({ connector: injected() })} style={{ cursor: 'pointer' }}>
            Connect Wallet to Mint
          </button>
        </div>
      ) : !onZg ? (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#f59e0b' }}>
            ⚠ wallet is on chain {chainId}, need 0G Galileo ({ZG_ID})
          </span>
          <button className="btn" onClick={() => switchChain({ chainId: ZG_ID })} style={{ cursor: 'pointer', fontSize: 11 }}>
            Switch Chain
          </button>
        </div>
      ) : null}

      {isConnected && (
        <button className="btn primary" onClick={handleMint} disabled={busy}
          style={{ cursor: busy ? 'wait' : 'pointer', marginBottom: 12 }}>
          {busy ? '● signing...' : `▸ MINT ${ticker.toUpperCase()} NFT ON 0G GALILEO`}
        </button>
      )}

      {logs.length > 0 && (
        <div style={{ background: '#030303', border: '1px solid var(--hair)', padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.7, marginTop: 8 }}>
          {logs.map((l, i) => (
            <div key={i} style={{ color: l.includes('✓') || l.includes('success') ? '#22c55e' : l.includes('ERROR') ? '#ef4444' : 'var(--mute)' }}>
              {l}
            </div>
          ))}
        </div>
      )}

      {err && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#ef4444', marginTop: 8 }}>ERROR: {err}</div>}

      <NavButtons onBack={onBack} />
    </div>
  )
}

// ─── Step 04: Launch (1-tx factory) + Register ─────────────────────────────
function ListStep({
  ticker, tokenId, txHash, description, price, archetypeId, operatorUrl,
  systemPrompt, skills,
}: {
  ticker: string; tokenId: string; txHash: string
  description: string; price: string; archetypeId: string; operatorUrl: string
  systemPrompt: string; skills: Skill[]
}) {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()

  const [launchState, setLaunchState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [launchLogs, setLaunchLogs] = useState<string[]>([])
  const [launchErr, setLaunchErr] = useState('')
  const [shareToken, setShareToken] = useState('')
  const [ipoAddr, setIpoAddr] = useState('')

  const [listState, setListState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [listErr, setListErr] = useState('')

  const llog = (t: string) => setLaunchLogs(p => [...p, t])

  const handleLaunch = async () => {
    if (!address || !tokenId || tokenId === '?') return
    setLaunchState('busy'); setLaunchErr(''); setLaunchLogs([])

    try {
      const shareName   = `${ticker.toUpperCase()} Agent Share`
      const shareSymbol = ticker.toUpperCase()
      const now         = BigInt(Math.floor(Date.now() / 1000))
      const pricePerShare = 10_000n          // 0.01 USDC per share (6-decimal)
      const ipoShares   = 200_000n * BigInt(1e18)  // 20% of 1M supply in IPO
      const ipoStartsAt = now + 60n          // starts in 60s
      const ipoEndsAt   = now + 30n * 86400n // 30-day window

      llog('[1/1] encoding LaunchParams...')
      const launchData = encodeAbiParameters(
        [{
          type: 'tuple',
          components: [
            { name: 'shareName',     type: 'string'  },
            { name: 'shareSymbol',   type: 'string'  },
            { name: 'pricePerShare', type: 'uint256' },
            { name: 'ipoShares',     type: 'uint256' },
            { name: 'ipoStartsAt',   type: 'uint64'  },
            { name: 'ipoEndsAt',     type: 'uint64'  },
          ],
        }],
        [{ shareName, shareSymbol, pricePerShare, ipoShares, ipoStartsAt, ipoEndsAt }],
      )

      llog('[1/1] sending safeTransferFrom to WallLaunchFactory...')
      llog('      → fractionalizes + deploys IPO + vault in one tx')

      const hash = await writeContractAsync({
        address: AGENT_NFT,
        abi: wallAgentNftAbi,
        functionName: 'safeTransferFrom',
        args: [address, FACTORY, BigInt(tokenId), launchData],
        chainId: ZG_ID,
      })
      llog(`[tx] submitted: ${hash.slice(0, 22)}...`)

      let rec = null
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 3000))
        try { rec = await zgClient.getTransactionReceipt({ hash }); if (rec) break } catch {}
      }
      if (!rec) throw new Error('launch tx timed out')

      let foundShare = '', foundIpo = '', foundVault = ''
      for (const evLog of rec.logs) {
        try {
          const decoded = decodeEventLog({ abi: wallLaunchFactoryAbi, ...evLog })
          if (decoded.eventName === 'AgentLaunched') {
            const a = decoded.args as { shareToken?: string; ipo?: string; vault?: string }
            foundShare = a.shareToken ?? ''
            foundIpo   = a.ipo       ?? ''
            foundVault = a.vault     ?? '' // retained for log display
          }
        } catch {}
      }

      setShareToken(foundShare); setIpoAddr(foundIpo)
      llog(`[✓] AgentShare: ${foundShare.slice(0, 18)}...`)
      llog(`[✓] IPO:        ${foundIpo.slice(0, 18)}...`)
      llog(`[✓] Vault:      ${foundVault.slice(0, 18)}...`)
      llog('800,000 shares sent to your wallet · 200,000 in IPO contract')
      setLaunchState('done')
    } catch (e: unknown) {
      setLaunchErr(e instanceof Error ? e.message.slice(0, 200) : String(e))
      setLaunchState('error')
    }
  }

  const handleListOnExchange = async () => {
    setListState('busy'); setListErr('')
    const priceUsdc = price ? String(Math.round(parseFloat(price) * 1_000_000)) : '100000'
    const result = await registerAgentInBackend({
      tokenId,
      ticker: ticker.toUpperCase(),
      name: `${ticker.toUpperCase()} Agent`,
      description: description || archetypeId,
      systemPrompt: systemPrompt || `You are ${ticker.toUpperCase()}, an AI agent on Wall of 0Gents. Your archetype is ${archetypeId}.`,
      model: 'google/gemini-2.0-flash-lite-001',
      priceUsdc,
      runtime: '0g-ai',
      shareToken: shareToken || undefined,
      operatorUrl: operatorUrl || undefined,
    })

    if (result.ok) {
      setListState('done')
    } else {
      setListErr(result.error ?? 'registration failed')
      setListState('error')
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Mint confirmation */}
      <div style={{ background: '#0a1a0a', border: '1px solid #22c55e', padding: '20px 24px', marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#22c55e', letterSpacing: '0.08em', marginBottom: 8 }}>
          ✓ MINT CONFIRMED
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>
          {ticker.toUpperCase()} · Token #{tokenId}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)' }}>
          NFT minted on 0G Galileo. Complete the steps below to launch on the exchange.
        </div>
        {txHash && (
          <a href={`https://chainscan-galileo.0g.ai/tx/${txHash}`} target="_blank" rel="noreferrer"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', textDecoration: 'none', display: 'block', marginTop: 8 }}>
            view mint tx on 0G explorer ↗ {txHash.slice(0, 18)}…
          </a>
        )}
      </div>

      {/* Sub-step 1: Launch via factory (1 tx) */}
      <div style={{ border: '1px solid var(--hair)', marginBottom: 16 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hair)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em',
            color: launchState === 'done' ? '#22c55e' : 'var(--accent)',
            background: launchState === 'done' ? '#0a1a0a' : '#1a0a0a',
            padding: '3px 8px', border: `1px solid ${launchState === 'done' ? '#22c55e' : 'var(--accent)'}`,
          }}>
            {launchState === 'done' ? '✓ DONE' : '01'}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg)', fontWeight: 700 }}>
            LAUNCH AGENT
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', marginLeft: 'auto' }}>
            1 wallet tx
          </span>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)', margin: '0 0 8px', lineHeight: 1.6 }}>
            One transaction does everything: fractionalize NFT → mint 1,000,000 {ticker.toUpperCase()} shares → deploy IPO contract → deploy revenue vault. 800,000 shares go to your wallet; 200,000 are loaded into the IPO at $0.01/share.
          </p>

          {launchState === 'idle' && (
            <button className="btn primary" onClick={handleLaunch} disabled={!address} style={{ cursor: 'pointer', fontSize: 11 }}>
              ▸ LAUNCH {ticker.toUpperCase()} (1 TX)
            </button>
          )}
          {launchState === 'busy' && (
            <button className="btn" disabled style={{ fontSize: 11 }}>● launching...</button>
          )}
          {launchState === 'done' && shareToken && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>AgentShare: <a href={`https://chainscan-galileo.0g.ai/token/${shareToken}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{shareToken.slice(0, 18)}… ↗</a></span>
              {ipoAddr && <span>IPO: <a href={`https://chainscan-galileo.0g.ai/address/${ipoAddr}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{ipoAddr.slice(0, 18)}… ↗</a></span>}
            </div>
          )}
          {launchState === 'error' && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#ef4444' }}>ERROR: {launchErr}</div>
          )}

          {launchLogs.length > 0 && (
            <div style={{ background: '#030303', border: '1px solid var(--hair)', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, lineHeight: 1.7, marginTop: 10 }}>
              {launchLogs.map((l, i) => (
                <div key={i} style={{ color: l.includes('✓') || l.startsWith('[✓]') ? '#22c55e' : l.includes('error') || l.includes('ERROR') ? '#ef4444' : 'var(--mute)' }}>{l}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sub-step 2: List on Exchange */}
      <div style={{ border: '1px solid var(--hair)', marginBottom: 28, opacity: launchState === 'done' ? 1 : 0.4 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hair)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em',
            color: listState === 'done' ? '#22c55e' : 'var(--accent)',
            background: listState === 'done' ? '#0a1a0a' : '#1a0a0a',
            padding: '3px 8px', border: `1px solid ${listState === 'done' ? '#22c55e' : 'var(--accent)'}`,
          }}>
            {listState === 'done' ? '✓ DONE' : '02'}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg)', fontWeight: 700 }}>
            LIST ON EXCHANGE
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', marginLeft: 'auto' }}>
            appears on markets table
          </span>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)', margin: '0 0 12px', lineHeight: 1.6 }}>
            Register {ticker.toUpperCase()} in the Wall of 0Gents exchange. Your agent will appear on the markets page and be discoverable by investors.
          </p>

          {listState === 'idle' && (
            <button className="btn primary" onClick={handleListOnExchange} disabled={launchState !== 'done'} style={{ cursor: launchState !== 'done' ? 'not-allowed' : 'pointer', fontSize: 11 }}>
              ▸ SAVE TO EXCHANGE
            </button>
          )}
          {listState === 'busy' && <button className="btn" disabled style={{ fontSize: 11 }}>● registering...</button>}
          {listState === 'done' && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#22c55e' }}>
              ✓ Listed on Wall of 0Gents exchange
            </div>
          )}
          {listState === 'error' && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#ef4444' }}>ERROR: {listErr}</div>
          )}
        </div>
      </div>

      {/* Done state */}
      {listState === 'done' && (
        <div style={{ background: '#0a1a0a', border: '1px solid #22c55e', padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#22c55e', marginBottom: 8 }}>
            ✓ {ticker.toUpperCase()} IS LIVE ON THE EXCHANGE
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)', lineHeight: 1.6 }}>
            Your agent is now discoverable. 200,000 shares are live in the IPO. Start your operator node to serve inference — revenue flows to shareholders via WallVault.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <button className="btn primary" style={{ cursor: 'pointer' }}>← Back to Markets</button>
        </Link>
        {listState === 'done' && (
          <Link href={`/agent/${ticker.toUpperCase()}`} style={{ textDecoration: 'none' }}>
            <button className="btn" style={{ cursor: 'pointer' }}>View {ticker.toUpperCase()} ▸</button>
          </Link>
        )}
      </div>
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function LaunchPage() {
  const [step, setStep] = useState<WizStep>('archetype')
  const [completed, setCompleted] = useState<Set<WizStep>>(new Set())

  const [archetypeId, setArchetypeId] = useState<string | null>(null)
  const [ticker, setTicker] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('0.10')
  const [operatorUrl, setOperatorUrl] = useState('')

  const [runtime, setRuntime] = useState('0g-ai')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [skills, setSkills] = useState<Skill[]>([])

  const [mintedId, setMintedId] = useState('')
  const [mintedHash, setMintedHash] = useState('')

  const advance = (from: WizStep, to: WizStep) => {
    setCompleted(p => new Set([...p, from]))
    setStep(to)
  }

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ padding: '12px 0', borderBottom: '1px solid var(--hair)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)', marginBottom: 0 }}>
        <Link href="/" style={{ color: 'var(--mute)', textDecoration: 'none' }}>~/markets</Link>
        {' · '}
        <Link href="/launch" style={{ color: 'var(--mute)', textDecoration: 'none' }}>launch</Link>
        {' · '}
        <span style={{ color: 'var(--fg)' }}>
          step {String(STEPS.findIndex(s => s.id === step) + 1).padStart(2, '0')} / 04
        </span>
        <span style={{ marginLeft: 'auto', float: 'right', color: 'var(--mute)', fontSize: 10 }}>
          permissionless · 0g-galileo · agent nft {AGENT_NFT.slice(0, 10)}…{AGENT_NFT.slice(-8)}
        </span>
      </div>

      <StepBar current={step} completed={completed} />

      {step === 'archetype' && (
        <ArchetypeStep
          selected={archetypeId}
          onSelect={id => {
            setArchetypeId(id)
            const a = ARCHETYPES.find(x => x.id === id)!
            setDescription(a.tagline)
            setSystemPrompt(defaultSystemPrompt('', a))
          }}
          onContinue={() => advance('archetype', 'identity')}
        />
      )}

      {step === 'identity' && archetypeId && (
        <IdentityStep
          archetypeId={archetypeId}
          ticker={ticker} setTicker={setTicker}
          description={description} setDescription={setDescription}
          price={price} setPrice={setPrice}
          operatorUrl={operatorUrl} setOperatorUrl={setOperatorUrl}
          runtime={runtime} setRuntime={setRuntime}
          systemPrompt={systemPrompt} setSystemPrompt={setSystemPrompt}
          skills={skills} setSkills={setSkills}
          onBack={() => setStep('archetype')}
          onContinue={() => advance('identity', 'review')}
        />
      )}

      {step === 'review' && (
        <ReviewStep
          ticker={ticker} archetypeId={archetypeId!} price={price} operatorUrl={operatorUrl}
          onBack={() => setStep('identity')}
          onMinted={(id, hash) => {
            setMintedId(id); setMintedHash(hash)
            advance('review', 'list')
          }}
        />
      )}

      {step === 'list' && (
        <ListStep
          ticker={ticker} tokenId={mintedId} txHash={mintedHash}
          description={description} price={price}
          archetypeId={archetypeId ?? ''} operatorUrl={operatorUrl}
          systemPrompt={systemPrompt} skills={skills}
        />
      )}
    </>
  )
}
