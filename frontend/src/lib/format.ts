export function shortAddr(addr: string, chars = 4): string {
  if (!addr) return '—'
  return `${addr.slice(0, chars + 2)}…${addr.slice(-chars)}`
}

export function formatUsdc(v: bigint, frac = 2): string {
  const n = Number(v) / 1e6
  return n.toLocaleString('en-US', { minimumFractionDigits: frac, maximumFractionDigits: frac })
}

export function formatUsdcPrice(v: bigint | number): string {
  const n = typeof v === 'bigint' ? Number(v) / 1e6 : v / 1e6
  if (n === 0) return '$0.00'
  if (n >= 0.01) return `$${n.toFixed(2)}`
  return `$${n.toFixed(6).replace(/0+$/, '')}`
}

export function formatShares(v: bigint, frac = 0): string {
  const n = Number(v) / 1e18
  return n.toLocaleString('en-US', { minimumFractionDigits: frac, maximumFractionDigits: frac })
}

export function relativeTime(ts: number): string {
  const sec = ts > 1e11 ? ts / 1000 : ts
  const diff = Math.floor(Date.now() / 1000) - sec
  if (diff < 0) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
