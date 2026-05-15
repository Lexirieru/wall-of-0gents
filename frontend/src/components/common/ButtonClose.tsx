'use client'

import { useSound } from '@/hooks/useSound'
import { t } from '@/data/strings'
import styles from './ButtonClose.module.scss'

type Props = { onClick?: () => void }

export default function ButtonClose({ onClick }: Props) {
  const { playHoverSound, playClickSound } = useSound()
  return (
    <button
      className={`${styles.close} b2`}
      onMouseEnter={playHoverSound}
      onClick={() => {
        playClickSound()
        onClick?.()
      }}
    >
      {t.close}
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 7L17 17M17 7L7 17" stroke="white" strokeWidth="2" />
      </svg>
    </button>
  )
}
