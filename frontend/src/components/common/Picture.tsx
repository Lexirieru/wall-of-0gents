'use client'
import { useRef, useEffect, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './Picture.module.scss'

type Props = { src: string; alt?: string }

export default function Picture({ src, alt = 'image' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showCanvas, setShowCanvas] = useState(true)
  const scale = 0.1

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const drawPixelated = () => {
      if (!canvasRef.current || !containerRef.current) return
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const img = new Image()
      img.src = src
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        if (!containerRef.current) return
        const { width, height } = containerRef.current.getBoundingClientRect()
        canvas.width = width
        canvas.height = height
        const temp = document.createElement('canvas')
        const tCtx = temp.getContext('2d')
        temp.width = width * (scale / (width / 100))
        temp.height = height * (scale / (width / 100))
        tCtx?.drawImage(img, 0, 0, temp.width, temp.height)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, width, height)
      }
    }

    drawPixelated()

    ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'center bottom',
      once: true,
      onEnter() {
        setTimeout(() => setShowCanvas(false), 500)
      },
    })
  }, [src])

  return (
    <div ref={containerRef} className={styles.imageWrapper}>
      {showCanvas && <canvas ref={canvasRef} className={styles.canvas} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.image} src={src} alt={alt} draggable={false} />
    </div>
  )
}
