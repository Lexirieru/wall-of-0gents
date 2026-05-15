'use client'

import { useEffect } from 'react'

export function useLockScroll(locked: boolean) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const original = document.documentElement.style.overflow
    if (locked) {
      document.documentElement.style.overflow = 'hidden'
    }
    return () => {
      document.documentElement.style.overflow = original
    }
  }, [locked])
}
