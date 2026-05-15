'use client'

import { useViewport } from './useViewport'

export function useSound() {
  const { isMobile } = useViewport()

  const playSound = (src: string) => {
    if (isMobile) return
    if (typeof window === 'undefined') return
    try {
      const audio = new Audio(src)
      audio.currentTime = 0
      audio.play().catch(() => {})
    } catch {}
  }

  return {
    playHoverSound: () => playSound('/sounds/hover.mp3'),
    playClickSound: () => playSound('/sounds/click.mp3'),
  }
}
