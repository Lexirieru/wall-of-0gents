'use client'
import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createPortal } from 'react-dom'
import Picture from '@/components/common/Picture'
import ButtonDefault from '@/components/common/ButtonDefault'
import WorksPopup from './Popup'
import { useLockScroll } from '@/hooks/useLockScroll'
import { t } from '@/data/strings'
import styles from './Items.module.scss'

export const worksItemsData = [
  {
    id: 1,
    title: 'Project Alpha',
    client: 'Client A',
    year: '2024',
    type: 'Brand',
    mainPhoto: '/images/photo-decor.png',
    summary: ['We redefined the brand from scratch.'],
    strategy: [
      { title: 'Discovery', description: '<p>Deep dive into audience and market.</p>' },
    ],
    results: [
      { title: '3x', subtitle: 'Revenue Growth', description: 'Within 6 months of launch.' },
    ],
    gallery: [] as string[],
    review: null as null | { photo: string; name: string; position: string; text: string },
    text: '',
    beforeAfter: [] as unknown[],
    brandPhoto: '',
  },
  {
    id: 2,
    title: 'Project Beta',
    client: 'Client B',
    year: '2024',
    type: 'Web',
    mainPhoto: '/images/scratch-img.png',
    summary: ['A full digital experience.'],
    strategy: [],
    results: [],
    gallery: [] as string[],
    review: null as null | { photo: string; name: string; position: string; text: string },
    text: '',
    beforeAfter: [] as unknown[],
    brandPhoto: '',
  },
  {
    id: 3,
    title: 'Project Gamma',
    client: 'Client C',
    year: '2025',
    type: 'Identity',
    mainPhoto: '/images/scratch-img2.png',
    summary: ['Identity that speaks volumes.'],
    strategy: [],
    results: [],
    gallery: [] as string[],
    review: null as null | { photo: string; name: string; position: string; text: string },
    text: '',
    beforeAfter: [] as unknown[],
    brandPhoto: '',
  },
  {
    id: 4,
    title: 'Project Delta',
    client: 'Client D',
    year: '2025',
    type: 'Motion',
    mainPhoto: '/images/globe.png',
    summary: ['Motion that brings the brand to life.'],
    strategy: [],
    results: [],
    gallery: [] as string[],
    review: null as null | { photo: string; name: string; position: string; text: string },
    text: '',
    beforeAfter: [] as unknown[],
    brandPhoto: '',
  },
  {
    id: 5,
    title: 'Project Epsilon',
    client: 'Client E',
    year: '2025',
    type: 'Brand',
    mainPhoto: '/images/basket.png',
    summary: ['Brand storytelling at its best.'],
    strategy: [],
    results: [],
    gallery: [] as string[],
    review: null as null | { photo: string; name: string; position: string; text: string },
    text: '',
    beforeAfter: [] as unknown[],
    brandPhoto: '',
  },
]

export type WorkItem = typeof worksItemsData[0]

export default function WorksItems() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [popupOpen, setPopupOpen] = useState(false)
  const [clickedId, setClickedId] = useState<number>(0)
  const [locked, setLocked] = useState(false)
  const stRef = useRef<ScrollTrigger | null>(null)

  useLockScroll(locked)

  const allTypes = [...new Set(worksItemsData.map(i => i.type))]
  const filtered =
    activeFilter === 'all'
      ? worksItemsData
      : worksItemsData.filter(i => i.type.toLowerCase() === activeFilter)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    showHideFilter()
    return () => {
      stRef.current?.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter])

  const showHideFilter = () => {
    stRef.current?.kill()
    stRef.current = ScrollTrigger.create({
      trigger: `.${styles.items}`,
      start: `${filtered.length > 3 ? window.innerHeight / 1.4 : 200} bottom`,
      end: 'bottom bottom',
      onEnter() {
        gsap.to(`.${styles.filter}`, { y: 0, yPercent: 0 })
      },
      onLeaveBack() {
        gsap.to(`.${styles.filter}`, { yPercent: 101 })
      },
      onLeave() {
        gsap.to(`.${styles.filter}`, { yPercent: 101 })
      },
      onEnterBack() {
        gsap.to(`.${styles.filter}`, { y: 0, yPercent: 0 })
      },
    })
  }

  const openPopup = (id: number) => {
    setClickedId(id)
    setPopupOpen(true)
    setTimeout(() => {
      setLocked(true)
      gsap.to('.project-popup .blur', { opacity: 1 })
      gsap.to('.project-popup .popup-content', {
        y: 0,
        yPercent: 0,
        duration: 0.75,
      })
      gsap.to('.project-popup .close-wrap', { y: 0, yPercent: 0 })
    }, 50)
  }

  const closePopup = () => {
    const tl = gsap.timeline({
      onComplete: () => {
        setLocked(false)
        setPopupOpen(false)
      },
    })
    tl.to('.project-popup .popup-content', { yPercent: 101, duration: 0.75 })
    tl.to('.project-popup .close-wrap', { yPercent: -101 }, '<')
    tl.to('.project-popup .blur', { opacity: 0 }, '<50%')
  }

  return (
    <section className={styles.items}>
      <div className={styles.container}>
        {filtered.map(item => (
          <div
            key={item.id}
            className={styles.item}
            data-area-for-tip={t.learn_more}
            onClick={() => openPopup(item.id)}
          >
            <div className={styles.photo}>
              <Picture src={item.mainPhoto} />
            </div>
            <p className="b2">{item.title}</p>
            <p className="b2 description">
              {item.client} ({item.year})
            </p>
          </div>
        ))}
      </div>
      <div className={styles.filter}>
        {allTypes[1] && (
          <button>
            <ButtonDefault
              text={allTypes[1]}
              small
              active={activeFilter === allTypes[1].toLowerCase()}
              onClick={() => setActiveFilter(allTypes[1].toLowerCase())}
            />
          </button>
        )}
        <button>
          <ButtonDefault
            text={t.all_projects}
            small
            active={activeFilter === 'all'}
            onClick={() => setActiveFilter('all')}
          />
        </button>
        {allTypes[0] && (
          <button>
            <ButtonDefault
              text={allTypes[0]}
              small
              active={activeFilter === allTypes[0].toLowerCase()}
              onClick={() => setActiveFilter(allTypes[0].toLowerCase())}
            />
          </button>
        )}
      </div>
      {popupOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <WorksPopup
            itemId={clickedId}
            itemsData={worksItemsData}
            onClose={closePopup}
          />,
          document.body,
        )}
    </section>
  )
}
