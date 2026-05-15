'use client'
import { useRef, useState, useEffect } from 'react'
import { gsap } from 'gsap'
import styles from './Tip.module.scss'

export default function Tip() {
  const tipRef = useRef<HTMLSpanElement>(null)
  const coinRef = useRef<HTMLImageElement>(null)
  const [text, setText] = useState('')
  const cursorX = useRef(0)
  const cursorY = useRef(0)

  useEffect(() => {
    const updateTipPosition = () => {
      const tip = tipRef.current
      const coin = coinRef.current
      if (!tip || !coin) return

      const el = document.elementFromPoint(cursorX.current, cursorY.current)
      if (!el) return

      const areaEl = el.closest('[data-area-for-tip]') as HTMLElement | null
      if (!areaEl) {
        gsap.set(coin, { opacity: 0 })
        gsap.to(tip, { autoAlpha: 0, duration: 0.2, overwrite: 'auto' })
        return
      }

      setText(areaEl.getAttribute('data-area-for-tip') || '')
      const isLeft = !!el.closest('[data-tip-left]')
      const hasCoin = !!el.closest('[data-tip-coin]')
      gsap.set(coin, { opacity: hasCoin ? 1 : 0 })
      gsap.to(tip, { autoAlpha: 1, duration: 0.2, overwrite: 'auto' })

      const x = isLeft ? cursorX.current - 10 : cursorX.current + 10
      gsap.set(tip, { x, y: cursorY.current, xPercent: isLeft ? -100 : 0 })
    }

    const handleMove = (e: MouseEvent) => {
      cursorX.current = e.clientX
      cursorY.current = e.clientY
      updateTipPosition()
    }
    const handleScroll = () => updateTipPosition()

    window.addEventListener('pointermove', handleMove, { passive: true })
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <span ref={tipRef} className={`${styles.tip} b3`} data-tip style={{ opacity: 0, visibility: 'hidden' }}>
      {text}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={coinRef} className={styles.coin} src="/images/coin.png" alt="" style={{ opacity: 0 }} />
    </span>
  )
}
