'use client'

import { useEffect, useState } from 'react'
import ButtonCloseSmall from '@/components/common/ButtonCloseSmall'
import { useSound } from '@/hooks/useSound'
import { t } from '@/data/strings'
import styles from './TheCookies.module.scss'

export default function TheCookies() {
  const [isCookies, setIsCookies] = useState(true)
  const { playHoverSound, playClickSound } = useSound()

  useEffect(() => {
    if (localStorage.getItem('isCookiesAccepted')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCookies(false)
    }
  }, [])

  if (!isCookies) return null

  const onCookiesClose = () => {
    playClickSound()
    setIsCookies(false)
    localStorage.setItem('isCookiesAccepted', 'true')
  }

  return (
    <div className={styles.cookies}>
      <ButtonCloseSmall onClick={() => setIsCookies(false)} />
      <p className={styles.emoji}>🍪</p>
      <p className="b3">
        {t.cookie_text}
        <br />
        <a href="#" target="_blank" className={`${styles.link} hover-line-hide b3`}>
          {t.learn_more}
        </a>
      </p>
      <button
        className={`${styles.btn} b3`}
        onMouseEnter={playHoverSound}
        onClick={onCookiesClose}
      >
        {t.accept}
      </button>
    </div>
  )
}
