'use client'
import { useState, useEffect } from 'react'
import { gsap } from 'gsap'
import ButtonClose from './ButtonClose'
import VideoPlayer from './VideoPlayer'
import { useLockScroll } from '@/hooks/useLockScroll'
import styles from './VideoPopup.module.scss'

type Props = { src: string; onClose: () => void }

export default function VideoPopup({ src, onClose }: Props) {
  const [locked, setLocked] = useState(true)
  useLockScroll(locked)

  useEffect(() => {
    gsap.to(`.${styles.videoPopup}`, { opacity: 1 })
    return () => setLocked(false)
  }, [])

  const handleClose = () => {
    setLocked(false)
    gsap.to(`.${styles.videoPopup}`, {
      opacity: 0,
      onComplete: onClose,
    })
  }

  return (
    <div className={styles.videoPopup}>
      <div className={styles.videoClose}>
        <ButtonClose onClick={handleClose} />
      </div>
      <VideoPlayer src={src} />
    </div>
  )
}
