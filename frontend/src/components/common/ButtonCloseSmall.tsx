'use client'

import { useSound } from '@/hooks/useSound'
import styles from './ButtonCloseSmall.module.scss'

type Props = { className?: string; onClick?: () => void }

export default function ButtonCloseSmall({ className, onClick }: Props) {
  const { playHoverSound, playClickSound } = useSound()
  return (
    <button
      className={[styles.close, className].filter(Boolean).join(' ')}
      onMouseEnter={playHoverSound}
      onClick={() => {
        playClickSound()
        onClick?.()
      }}
    >
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M4.28516 4.28516L11.7148 11.7148M11.7148 4.28516L4.28516 11.7148"
          stroke="white"
          strokeWidth="2"
        />
      </svg>
    </button>
  )
}
