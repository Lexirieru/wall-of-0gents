'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { gsap } from 'gsap'

const NAV = [
  { href: '/markets', label: 'markets', match: (p: string) => p === '/markets' || p.startsWith('/agent') },
  { href: '/launch', label: 'deploy', match: (p: string) => p.startsWith('/launch') },
  { href: '/portfolio', label: 'portfolio', match: (p: string) => p.startsWith('/portfolio') },
]

function Clock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      setTime(`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return <span>{time}</span>
}

function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    const short = `${address.slice(0, 6)}…${address.slice(-4)}`
    return (
      <button className="btn" onClick={() => disconnect()} title={address} style={{ cursor: 'pointer' }}>
        {short}
      </button>
    )
  }

  return (
    <button className="btn primary" onClick={() => connect({ connector: injected() })} style={{ cursor: 'pointer' }}>
      Connect ▸
    </button>
  )
}

export function Masthead() {
  const path = usePathname()
  const headerRef = useRef<HTMLElement>(null)
  const brandRef = useRef<HTMLAnchorElement>(null)
  const navLinkRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const sessionRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const cursorRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, { y: -44, duration: 0.5, ease: 'power3.out' })
      gsap.from(brandRef.current, { opacity: 0, x: -12, duration: 0.4, delay: 0.15, ease: 'power2.out' })
      gsap.from(navLinkRefs.current.filter(Boolean), {
        opacity: 0, y: -8, stagger: 0.07, duration: 0.3, delay: 0.2, ease: 'power2.out',
      })
      gsap.from(sessionRef.current, { opacity: 0, x: 12, duration: 0.4, delay: 0.3, ease: 'power2.out' })
      gsap.to(cursorRef.current, { opacity: 0, repeat: -1, yoyo: true, duration: 0.55, ease: 'steps(1)' })

      const activeIndex = NAV.findIndex(n => n.match(path || '/'))
      const activeEl = navLinkRefs.current[activeIndex]
      if (indicatorRef.current) {
        if (activeEl) {
          gsap.set(indicatorRef.current, { x: activeEl.offsetLeft, width: activeEl.offsetWidth })
        } else {
          gsap.set(indicatorRef.current, { width: 0 })
        }
      }
    })
    return () => ctx.revert()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const indicator = indicatorRef.current
    if (!indicator) return
    const activeIndex = NAV.findIndex(n => n.match(path || '/'))
    if (activeIndex === -1) {
      gsap.to(indicator, { width: 0, duration: 0.25, ease: 'power3.in' })
      return
    }
    const activeEl = navLinkRefs.current[activeIndex]
    if (!activeEl) return
    gsap.to(indicator, { x: activeEl.offsetLeft, width: activeEl.offsetWidth, duration: 0.35, ease: 'power3.out' })
  }, [path])

  return (
    <header ref={headerRef} className="masthead" style={{ position: 'sticky', top: 0, zIndex: 200 }}>
      <div className="masthead-inner">
        <Link ref={brandRef} href="/" className="brand">
          <span style={{ color: '#FF001B', fontWeight: 900 }}>◼</span>
          <span>WALL OF 0GENTS</span>
          <span ref={cursorRef} className="brand-cursor">█</span>
        </Link>

        <nav className="topnav">
          <span ref={indicatorRef} className="nav-indicator" aria-hidden="true" />
          {NAV.map((n, i) => (
            <Link
              key={n.href}
              href={n.href}
              ref={el => { navLinkRefs.current[i] = el }}
              className={n.match(path || '/') ? 'active' : ''}
            >
              <span className="nav-slash">/</span>{n.label}
            </Link>
          ))}
        </nav>

        <div ref={sessionRef} className="session">
          <span className="dot" />
          <span>0g-galileo</span>
          <Clock />
          <ConnectButton />
        </div>
      </div>
    </header>
  )
}
