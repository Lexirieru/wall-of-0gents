'use client'

import { useEffect, useRef } from 'react'
import { heroData, t } from '@/data/strings'
import styles from './Hero.module.scss'

export default function IntroHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    let isDrawing = false
    let lastX = 0
    let lastY = 0
    const eraserRadius = 60

    const start = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      lastX = e.clientX - rect.left
      lastY = e.clientY - rect.top
      isDrawing = true
      erase(e)
    }
    const stop = () => {
      isDrawing = false
    }
    const erase = (e: MouseEvent) => {
      if (!isDrawing) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      ctx.globalCompositeOperation = 'destination-out'
      const drawCircle = (cx: number, cy: number) => {
        const gradient = ctx.createRadialGradient(cx, cy, eraserRadius * 0.1, cx, cy, eraserRadius)
        gradient.addColorStop(0, 'rgba(0,0,0,1)')
        gradient.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(cx, cy, eraserRadius, 0, Math.PI * 2)
        ctx.fill()
      }
      const dx = x - lastX
      const dy = y - lastY
      const distance = Math.sqrt(dx * dx + dy * dy)
      const step = 10
      for (let i = 0; i < distance; i += step) {
        drawCircle(lastX + (dx * i) / distance, lastY + (dy * i) / distance)
      }
      lastX = x
      lastY = y
    }
    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', erase)
    canvas.addEventListener('mouseup', stop)
    canvas.addEventListener('mouseleave', stop)
    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', erase)
      canvas.removeEventListener('mouseup', stop)
      canvas.removeEventListener('mouseleave', stop)
    }
  }, [])

  return (
    <section className={`${styles.hero} hero`}>
      <div className={styles.sticky} data-area-for-tip={t.press_hold}>
        <canvas ref={canvasRef} className={styles.eraserCanvas} />
        <div className={styles.bgGradient} />
        <div className={styles.photo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="inner-img" src={heroData.photo} alt="hero photo" draggable={false} />
        </div>
      </div>
      <div className={styles.sticky2}>
        <p className={`${styles.description} p1`}>
          <span>{heroData.description.text1}</span>
          <span>{heroData.description.text2}</span>
          <span>{heroData.description.text3}</span>
          <span>{heroData.description.text4}</span>
        </p>
        <p className={`${styles.description2} b3`}>{heroData.text}</p>
      </div>
    </section>
  )
}
