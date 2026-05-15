'use client'

import { useEffect, useState } from 'react'
import { preloaderData, t } from '@/data/strings'
import { useUi } from './providers/UiProvider'
import IconLogo from './icon/Logo'
import styles from './ThePreloader.module.scss'

export default function ThePreloader() {
  const { preloaderDone, setPreloaderDone } = useUi()
  const [progress, setProgress] = useState(0)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const start = Date.now()
    const duration = 2200

    const tick = () => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, Math.round((elapsed / duration) * 100))
      setProgress(pct)
      if (pct < 100) {
        requestAnimationFrame(tick)
      } else {
        setExiting(true)
        setTimeout(() => setPreloaderDone(true), 600)
      }
    }
    requestAnimationFrame(tick)
  }, [setPreloaderDone])

  if (preloaderDone) return null

  return (
    <div className={[styles.preloader, exiting ? styles.exit : ''].join(' ')}>
      <div className={styles.gradient} />
      <div className={`${styles.progress} b2`}>
        <p>{t.loading}</p>
        <p>{progress}%</p>
      </div>
      <div className={styles.wrap}>
        <div className={styles.logoMob}>
          <IconLogo />
        </div>
        <div className={styles.fact}>
          <div className={styles.titleWrap}>
            <p className={`${styles.title} h1`}>{preloaderData.info1.number}</p>
          </div>
          <div className={styles.descriptionWrap}>
            <p className={`${styles.description} b1`}>{preloaderData.info1.text}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
