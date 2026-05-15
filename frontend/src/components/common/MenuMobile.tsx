'use client'

import { useEffect, useState } from 'react'
import { t } from '@/data/strings'
import { footerData } from '@/data/strings'
import { useUi } from '@/components/providers/UiProvider'
import { useLockScroll } from '@/hooks/useLockScroll'
import { useScrollTo } from '@/hooks/useScrollTo'
import ButtonClose from './ButtonClose'
import ButtonInner from './ButtonInner'
import IconInstagram from '@/components/icon/Instagram'
import IconTelegram from '@/components/icon/Telegram'
import IconLinkedin from '@/components/icon/Linkedin'
import IconYoutube from '@/components/icon/Youtube'
import styles from './MenuMobile.module.scss'

type NavItem = { text: string; link: string; trigger?: string }

const nav: NavItem[] = [
  { text: t.header.intro, link: 'intro' },
  { text: t.header.about, link: 'about' },
  { text: t.header.services, link: 'services' },
  { text: t.header.works, link: 'works' },
  { text: t.header.feedback, link: 'feedback' },
  { text: t.header.contact, link: 'contact', trigger: 'contact-trigger' },
]

export default function MenuMobile() {
  const { isMenuOpen, setIsMenuOpen } = useUi()
  const [activeSection, setActiveSection] = useState('')
  const scrollTo = useScrollTo()
  useLockScroll(isMenuOpen)

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
    return () => cleanups.forEach((fn) => fn())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    ;(async () => {
      try {
        const { gsap } = await import('gsap')
        if (isMenuOpen) {
          gsap.to('.menu-mob .link', {
            y: 0,
            duration: 0.35,
            stagger: 0.07,
            willChange: 'transform',
            opacity: 1,
          })
          gsap.to('.menu-mob .foot', { opacity: 1, delay: 0.1 })
        } else {
          gsap.set('.menu-mob .link', { y: '100%', delay: 0.3, willChange: 'transform', opacity: 0 })
          gsap.set('.menu-mob .foot', { opacity: 0 })
        }
      } catch {}
    })()
  }, [isMenuOpen])

  const handleScrollTo = (link: string) => {
    setIsMenuOpen(false)
    setTimeout(() => scrollTo(link), 100)
  }

  return (
    <menu className={[styles.menuMob, isMenuOpen ? styles.opened : '', 'menu-mob'].join(' ')}>
      <div className={styles.background} />
      <div className={styles.menuWrap}>
        <div className={styles.closeWrap}>
          <ButtonClose onClick={() => setIsMenuOpen(false)} />
        </div>

        <div className={styles.links}>
          {nav.map((item, i) => (
            <a
              key={i}
              className={['link h2', styles.link, activeSection === item.link ? styles.active : ''].join(' ')}
              onClick={() => handleScrollTo(`.${item.trigger ? item.trigger : item.link}`)}
            >
              {item.text}
            </a>
          ))}
        </div>

        <div className={`${styles.foot} foot`}>
          <div className={styles.lang}>
            <a className={`${styles.langItem} h2 ${styles.active}`}>En</a>
            <span className="h2">/</span>
            <a className={`${styles.langItem} h2`}>Ua</a>
          </div>

          <div className={styles.info}>
            <a className={styles.emailBtn} href={`mailto:${footerData.email}`}>
              <ButtonInner bottom>{footerData.email}</ButtonInner>
            </a>

            <a href={footerData.instagram} target="_blank" rel="noreferrer">
              <ButtonInner bottom>
                <span className={styles.socIcon}>
                  <IconInstagram />
                </span>
              </ButtonInner>
            </a>
            <a href={footerData.telegram} target="_blank" rel="noreferrer">
              <ButtonInner bottom>
                <span className={styles.socIcon}>
                  <IconTelegram />
                </span>
              </ButtonInner>
            </a>
            <a href={footerData.linkedin} target="_blank" rel="noreferrer">
              <ButtonInner bottom>
                <span className={styles.socIcon}>
                  <IconLinkedin />
                </span>
              </ButtonInner>
            </a>
            <a href={footerData.youtube} target="_blank" rel="noreferrer">
              <ButtonInner bottom>
                <span className={styles.socIcon}>
                  <IconYoutube />
                </span>
              </ButtonInner>
            </a>
          </div>
        </div>
      </div>
    </menu>
  )
}
