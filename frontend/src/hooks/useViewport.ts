'use client'

import { useEffect, useState } from 'react'

export function useViewport() {
  const [isDesktop, setIsDesktop] = useState(true)
  const [width, setWidth] = useState(1440)

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      setWidth(w)
      setIsDesktop(w >= 1024)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return {
    isDesktop,
    isMobile: !isDesktop,
    width,
    viewports: { mobile: 375, desktop: 1024 },
  }
}
