'use client'

import { useEffect } from 'react'
import { t } from '@/data/strings'
import { useUi } from '@/components/providers/UiProvider'
import ButtonInner from './ButtonInner'
import styles from './HeaderMobile.module.scss'

export default function HeaderMobile() {
  const { setIsMenuOpen, setIsContactPopupOpen } = useUi()

  useEffect(() => {
    if (typeof window === 'undefined') return
    let cleanup: (() => void) | null = null
    ;(async () => {
      try {
        const { gsap } = await import('gsap')
        const { ScrollTrigger } = await import('gsap/ScrollTrigger')
        gsap.registerPlugin(ScrollTrigger)
        const trig = ScrollTrigger.create({
          trigger: '.intro .hero-mob',
          start: 'bottom center',
          end: 'bottom center',
          onEnter: () => {
            gsap.to('.header-mob .header-btn', { width: '33%' })
            gsap.to('.header-mob .name', { scale: 1 })
          },
          onEnterBack: () => {
            gsap.to('.header-mob .header-btn', { width: '49%' })
            gsap.to('.header-mob .name', { scale: 0 })
          },
        })
        cleanup = () => trig.kill()
      } catch {}
    })()
    return () => {
      cleanup?.()
    }
  }, [])

  return (
    <header className={`${styles.headerMob} header-mob`}>
      <button className={`${styles.headerBtn} ${styles.menuBtn} header-btn`}>
        <ButtonInner className={styles.btnTemplate}>
          <span onClick={() => setIsMenuOpen(true)}>🍔</span>
          <span onClick={() => setIsMenuOpen(true)}>{t.header.menu}</span>
        </ButtonInner>
      </button>

      <span className={`${styles.name} name`}>
        <svg viewBox="0 0 111 13" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0.463473 4.57499C0.463473 2.15095 5.03365 0.988281 14.4797 0.988281C24.0469 0.988281 29.5008 2.29846 29.5008 5.0663H20.4516C20.4516 4.16528 18.3798 3.6577 14.5097 3.6577C11.4628 3.6577 9.42161 3.95244 9.42161 4.46002C9.42161 5.0663 11.0362 5.29542 16.033 5.52481C25.2346 5.93451 29.8664 7.08064 29.8664 9.40625C29.8664 11.8303 25.2048 13.0092 15.637 13.0092C5.82632 13.0092 0.28125 11.6993 0.28125 8.93147H9.29985C9.29985 9.84875 11.4628 10.3398 15.4242 10.3398C18.7757 10.3398 20.9082 10.0122 20.9082 9.47214C20.9082 8.84959 19.3243 8.63674 14.3573 8.40735C5.00383 7.99792 0.463473 6.9006 0.463473 4.57499Z"
            fill="#FF001B"
          />
          <path
            d="M46.8603 8.24401C42.4826 8.24401 39.8633 8.63166 39.8633 9.34244C39.8633 9.90213 41.466 10.139 44.7107 10.139C49.6359 10.139 52.1379 9.60078 52.1379 8.63166V7.94294C50.7698 8.13649 49.0497 8.24401 46.8603 8.24401ZM52.1379 5.25146C52.1379 4.56247 50.3005 4.23961 46.5873 4.23961C42.326 4.23961 40.0588 4.67027 40.0588 5.53131H30.6003C30.6003 2.47397 35.4463 0.98845 46.3137 0.98845C57.2983 0.98845 61.9483 2.51725 61.9483 5.25146V12.7309H52.1379V11.56C49.7927 12.4428 46.0398 12.9165 40.8014 12.9165C32.9444 12.9165 29.8579 11.8183 29.8579 9.64379C29.8579 7.21093 33.7652 6.06977 43.577 6.06977C48.8938 6.06977 52.1379 5.81143 52.1379 5.44529V5.25146Z"
            fill="#FF001B"
          />
          <path
            d="M92.2798 5.05009L85.2717 11.5844H78.7208L71.7434 5.05009V12.7311H63.2124V1.26653H75.369L82.0119 7.53919L88.6235 1.26653H100.781V12.7311H92.2798V5.05009Z"
            fill="#FF001B"
          />
          <path d="M110.719 1.26658H101.974V12.7311H110.719V1.26658Z" fill="#FF001B" />
        </svg>
      </span>

      <button
        className={`${styles.headerBtn} ${styles.contactBtn} header-btn`}
        onClick={() => setIsContactPopupOpen(true)}
      >
        <ButtonInner className={styles.btnTemplate}>
          <span>☎️</span>
          <span>{t.header.contact}</span>
        </ButtonInner>
      </button>
    </header>
  )
}
