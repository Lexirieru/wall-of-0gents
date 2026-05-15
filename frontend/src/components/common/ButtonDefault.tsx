'use client'

import { useSound } from '@/hooks/useSound'
import styles from './ButtonDefault.module.scss'

type Props = {
  text: string
  small?: boolean
  active?: boolean
  onClick?: () => void
}

export default function ButtonDefault({ text, small, active, onClick }: Props) {
  const { playHoverSound, playClickSound } = useSound()

  const handleClick = () => {
    if (!active) playClickSound()
    onClick?.()
  }
  const handleMouseEnter = () => {
    if (!active) playHoverSound()
  }

  const classes = [
    styles.btnDefault,
    small ? 'b3' : 'b1',
    small ? styles.small : '',
    active ? styles.active : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} onMouseEnter={handleMouseEnter} onClick={handleClick}>
      {text}
    </span>
  )
}
