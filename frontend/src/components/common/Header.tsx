'use client'

import { useEffect, useState } from 'react'
import { t } from '@/data/strings'
import { useScrollTo } from '@/hooks/useScrollTo'
import ButtonInner from './ButtonInner'
import styles from './Header.module.scss'

type NavItem = { text: string; link: string; trigger?: string }

const nav: NavItem[] = [
  { text: t.header.intro, link: 'intro' },
  { text: t.header.about, link: 'about' },
  { text: t.header.services, link: 'services' },
  { text: t.header.works, link: 'works' },
  { text: t.header.contact, link: 'contact', trigger: 'contact-trigger' },
]

export default function Header() {
  const [activeSection, setActiveSection] = useState('')
  const scrollTo = useScrollTo()

  useEffect(() => {
    if (typeof window === 'undefined') return
    let cleanups: Array<() => void> = []
    ;(async () => {
      try {
        const { gsap } = await import('gsap')
        const { ScrollTrigger } = await import('gsap/ScrollTrigger')
        gsap.registerPlugin(ScrollTrigger)
        nav.forEach((section) => {
          const trig = ScrollTrigger.create({
            trigger: `.${section.link}`,
            start: 'top center',
            end: 'bottom center',
            onEnter: () => setActiveSection(section.link),
            onEnterBack: () => setActiveSection(section.link),
          })
          cleanups.push(() => trig.kill())
        })
      } catch {}
    })()
    return () => {
      cleanups.forEach((fn) => fn())
    }
  }, [])

  return (
    <header className={styles.header}>
      {nav.map((item, i) => (
        <a
          key={i}
          className={[styles.link, activeSection === item.link ? styles.active : ''].filter(Boolean).join(' ')}
          onClick={() => scrollTo(`.${item.trigger ? item.trigger : item.link}`)}
        >
          <ButtonInner className={styles.linkTemplate} active={activeSection === item.link}>
            <span>#{i + 1}</span>
            <span>{item.text}</span>
          </ButtonInner>
        </a>
      ))}
    </header>
  )
}
