'use client'

import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { heroData } from '@/data/strings'
import styles from './TheTitle.module.scss'

export default function TheTitle() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.intro .hero',
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
      },
    })

    tl.to(`.${styles.fixedTitle}`, { scaleY: 0, yPercent: 12, duration: 1.5 })
    tl.to('.fixed-logo', { scaleY: 0, yPercent: -20, duration: 1.5 }, '<')
    tl.from('.intro .hero .description .col-1', { opacity: 0, duration: 0.3 }, '-=1.3')
    tl.from('.intro .hero .description .col-2', { opacity: 0, duration: 0.3 }, '-=0.9')
    tl.from('.intro .hero .description .col-3', { opacity: 0, duration: 0.3 }, '-=0.6')
    tl.from('.intro .hero .description .col-4', { opacity: 0, duration: 0.3 }, '-=0.3')
    tl.to('footer.footer .name', { opacity: 1, duration: 0.3 }, '<')
    tl.to('.intro .hero .description', { yPercent: -65, duration: 2 }, '<')
    tl.from('.intro .hero .description-2', { opacity: 0, duration: 0.2 }, '<40%')

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill())
    }
  }, [])

  const sub = heroData.subtitle

  return (
    <div className={styles.fixedTitle}>
      <div className={styles.nameWrap}>
        <svg
          className={styles.name}
          viewBox="0 0 1424 155"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* S */}
          <path
            d="M2.34961 46.2476C2.34961 14.9917 61.2783 0 183.077 0C306.438 0 376.762 16.8936 376.762 52.5827H260.079C260.079 40.9648 233.365 34.42 183.465 34.42C144.176 34.42 117.857 38.2203 117.857 44.7652C117.857 52.5827 138.676 55.537 203.105 58.4948C321.753 63.7776 381.476 78.5559 381.476 108.543C381.476 139.799 321.368 155 198 155C71.4991 155 0 138.11 0 102.421H116.287C116.287 114.248 144.176 120.58 195.255 120.58C238.47 120.58 265.968 116.357 265.968 109.392C265.968 101.365 245.544 98.6205 181.5 95.6627C60.8938 90.3835 2.34961 76.2345 2.34961 46.2476Z"
            fill="#FF001B"
          />
          {/* A */}
          <path
            d="M600.599 93.5567C544.151 93.5567 510.377 98.5551 510.377 107.72C510.377 114.937 531.043 117.991 572.88 117.991C636.387 117.991 668.648 111.051 668.648 98.5551V89.6746C651.008 92.1703 628.829 93.5567 600.599 93.5567ZM668.648 54.9702C668.648 46.0862 644.956 41.9232 597.078 41.9232C542.133 41.9232 512.898 47.4762 512.898 58.5786H390.939C390.939 19.1567 453.424 0.00216983 593.55 0.00216983C735.188 0.00216983 795.146 19.7148 795.146 54.9702V151.412H668.648V136.313C638.409 147.696 590.018 153.804 522.474 153.804C421.164 153.804 381.367 139.644 381.367 111.606C381.367 80.2359 431.748 65.5216 558.263 65.5216C626.818 65.5216 668.648 62.1905 668.648 57.4694V54.9702Z"
            fill="#FF001B"
          />
          {/* M */}
          <path
            d="M1186.24 52.3737L1095.88 136.628H1011.41L921.445 52.3737V151.414H811.444V3.58781H968.195L1053.85 84.4686L1139.1 3.58781H1295.86V151.414H1186.24V52.3737Z"
            fill="#FF001B"
          />
          {/* I */}
          <path
            d="M1424 3.58846H1311.25V151.414H1424V3.58846Z"
            fill="#FF001B"
          />
        </svg>
      </div>
      <p className={`${styles.text} b1`}>
        <span>{sub.text1}</span>
        <span>{sub.text2}</span>
        <span>{sub.text3}</span>
        <span>{sub.text4}</span>
      </p>
    </div>
  )
}
