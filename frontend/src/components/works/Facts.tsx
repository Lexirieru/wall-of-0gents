'use client'
import { useRef, useEffect, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Logo from '@/components/icon/Logo'
import { t } from '@/data/strings'
import styles from './Facts.module.scss'

const factsData = [
  { number: '150+', text: 'Projects delivered with love and precision.' },
  { number: '5', text: 'Years building brands that people remember.' },
  { number: '30+', text: 'Countries where our work lives.' },
  { number: '98%', text: 'Client satisfaction rate.' },
]

export default function WorksFacts() {
  const [tipText, setTipText] = useState('')
  const currentIndex = useRef(0)
  const prevIndex = useRef(0)
  const isAnimPlay = useRef(false)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    // eslint-disable-next-line react-hooks/immutability
    initFacts()
    // eslint-disable-next-line react-hooks/immutability
    setPaginationHeight()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initFacts = () => {
    const facts = document.querySelectorAll(`.${styles.item}`)
    facts.forEach((f, i) => {
      gsap.set(f, { opacity: i === 0 ? 1 : 0 })
    })
    showFact(0, 0, true)
  }

  const setPaginationHeight = () => {
    const items = document.querySelectorAll(`.${styles.paginationNumber}`)
    if (items[0]) {
      gsap.set(`.${styles.paginationItems}`, {
        height: (items[0] as HTMLElement).clientHeight,
      })
    }
  }

  const showFact = (newIdx: number, oldIdx: number, initial = false) => {
    if (isAnimPlay.current && !initial) return
    isAnimPlay.current = true

    const facts = document.querySelectorAll(`.${styles.item}`)
    const pagination = document.querySelectorAll(`.${styles.paginationNumber}`)
    const tl = gsap.timeline({
      onComplete: () => {
        isAnimPlay.current = false
      },
    })

    tl.set(facts[newIdx], { opacity: 1 })

    if (newIdx === oldIdx && !initial) {
      isAnimPlay.current = false
      return
    }

    const prevFact = facts[oldIdx]
    const prevNum = prevFact?.querySelector(`.${styles.number}`)
    const currentFact = facts[newIdx]
    const currentNum = currentFact?.querySelector(`.${styles.number}`)

    tl.to(pagination, { yPercent: -newIdx * 100, duration: 0.75 }, '<')
    tl.fromTo(
      prevNum,
      { scaleY: 1 },
      { scaleY: 0.01, transformOrigin: 'top', duration: 0.75 },
      '<',
    )
    tl.fromTo(
      currentNum,
      { scaleY: 0.01 },
      { scaleY: 1, transformOrigin: 'bottom', duration: 0.75 },
      '<',
    )
    tl.fromTo(
      prevNum,
      { opacity: 1 },
      { opacity: 0, duration: 0.2 },
      '<80%',
    )
    tl.set(prevFact, { opacity: 0 })
  }

  const nextFact = () => {
    if (isAnimPlay.current) return
    prevIndex.current = currentIndex.current
    currentIndex.current = (currentIndex.current + 1) % factsData.length
    showFact(currentIndex.current, prevIndex.current)
  }

  const prevFact = () => {
    if (isAnimPlay.current) return
    prevIndex.current = currentIndex.current
    currentIndex.current =
      (currentIndex.current - 1 + factsData.length) % factsData.length
    showFact(currentIndex.current, prevIndex.current)
  }

  return (
    <section className={styles.facts}>
      <div className={styles.logo}>
        <Logo />
      </div>
      <div className={styles.items}>
        {factsData.map((fact, i) => (
          <div key={i} className={styles.item}>
            <div className={styles.number}>
              <p className="h1">{fact.number}</p>
            </div>
            <div className={styles.info}>
              <p className="p1">{fact.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div
        className={styles.navigation}
        data-area-for-tip={tipText}
      >
        <div
          data-tip-left
          onClick={prevFact}
          onMouseEnter={() => setTipText(t.prev_fact)}
        />
        <div
          onClick={nextFact}
          onMouseEnter={() => setTipText(t.next_fact)}
        />
      </div>
      <div className={`${styles.pagination} b2`}>
        <span className={styles.paginationItems}>
          {factsData.map((_, i) => (
            <span key={i} className={styles.paginationNumber}>
              {i + 1}
            </span>
          ))}
        </span>
        <span> - {factsData.length}</span>
      </div>
    </section>
  )
}
