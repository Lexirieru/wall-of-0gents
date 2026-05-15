'use client'

export function useScrollTo() {
  return (target: string | number, options?: { offset?: number; immediate?: boolean; duration?: number }) => {
    if (typeof window === 'undefined') return
    if (typeof target === 'number') {
      window.scrollTo({ top: target + (options?.offset || 0), behavior: options?.immediate ? 'auto' : 'smooth' })
      return
    }
    const el = document.querySelector(target) as HTMLElement | null
    if (!el) return
    const rect = el.getBoundingClientRect()
    const top = rect.top + window.scrollY + (options?.offset || 0)
    window.scrollTo({ top, behavior: options?.immediate ? 'auto' : 'smooth' })
  }
}
