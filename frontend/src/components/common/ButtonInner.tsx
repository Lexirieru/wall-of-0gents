'use client'

import { ReactNode } from 'react'
import { useSound } from '@/hooks/useSound'
import styles from './ButtonInner.module.scss'

type Props = {
  active?: boolean
  bottom?: boolean
  className?: string
  children: ReactNode
}

export default function ButtonInner({ active, bottom, className, children }: Props) {
  const { playHoverSound, playClickSound } = useSound()

  const handleClick = () => {
    if (!active) playClickSound()
  }
  const handleMouseEnter = () => {
    if (!active) playHoverSound()
  }

  const classes = [
    styles.btnInner,
    'b2',
    active ? styles.active : '',
    bottom ? styles.bottom : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} onMouseEnter={handleMouseEnter} onClick={handleClick}>
      {children}
    </span>
  )
}
