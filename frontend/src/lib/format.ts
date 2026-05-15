export function shortAddr(addr: string, chars = 4): string {
  if (!addr) return '—'
  return `${addr.slice(0, chars + 2)}…${addr.slice(-chars)}`
}

export function formatUsdc(v: bigint, frac = 2): string {
  const n = Number(v) / 1e6
  return n.toLocaleString('en-US', { minimumFractionDigits: frac, maximumFractionDigits: frac })
}

export function formatShares(v: bigint, frac = 0): string {
  const n = Number(v) / 1e18
  return n.toLocaleString('en-US', { minimumFractionDigits: frac, maximumFractionDigits: frac })
}

export function relativeTime(unixSec: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSec
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
