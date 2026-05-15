'use client'
import { useState } from 'react'
import { gsap } from 'gsap'
import ButtonClose from '@/components/common/ButtonClose'
import ButtonDefault from '@/components/common/ButtonDefault'
import Logo from '@/components/icon/Logo'
import { useSound } from '@/hooks/useSound'
import { t } from '@/data/strings'
import styles from './Popup.module.scss'

type WorkItem = {
  id: number
  title: string
  client: string
  year: string
  type: string
  mainPhoto: string
  brandPhoto?: string
  summary?: string[]
  strategy?: { title: string; description: string }[]
  results?: { title: string; subtitle: string; description: string }[]
  gallery?: string[]
  review?: {
    photo: string
    name: string
    position: string
    text: string
  } | null
  text?: string
  beforeAfter?: unknown[]
}

type Props = {
  itemId: number
  itemsData: WorkItem[]
  onClose: () => void
}

export default function WorksPopup({ itemId, itemsData, onClose }: Props) {
  const { playHoverSound, playClickSound } = useSound()
  const item = itemsData.find(i => i.id === itemId) ?? itemsData[0]
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null)

  const toggleAccordion = (i: number) => {
    const contents = document.querySelectorAll('.project-popup .list-content')
    if (activeAccordion === i) {
      gsap.to(contents[i], { height: 0 })
      setActiveAccordion(null)
    } else {
      if (activeAccordion !== null) {
        gsap.to(contents[activeAccordion], { height: 0 })
      }
      gsap.to(contents[i], { height: 'auto' })
      setActiveAccordion(i)
    }
  }

  return (
    <div className="project-popup">
      <div
        className="blur"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.15)',
          backdropFilter: 'blur(28.5px)',
          opacity: 0,
        }}
      />
      <div
        className="close-wrap"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: 'translateY(-101%)',
        }}
      >
        <ButtonClose onClick={onClose} />
      </div>
      <div
        className={`popup-content ${styles.popupContent}`}
        data-lenis-prevent=""
      >
        <div className={styles.logo}>
          <Logo />
        </div>

        {/* Head */}
        <div className={`${styles.wrap} ${styles.head}`}>
          <div className={styles.left}>
            <div className={styles.mainPhoto}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.innerImg}
                src={item.mainPhoto}
                alt={item.title}
              />
            </div>
          </div>
          <div className={styles.right}>
            <div className={styles.topInfo}>
              <div className={styles.client}>
                <p className="p4">{t.project.client}</p>
                <p className="b2">{item.client}</p>
              </div>
              <div className={styles.service}>
                <p className="p4">{t.project.service}</p>
                <p className="b2">{item.type}</p>
              </div>
              <div className={styles.year}>
                <p className="p4">{t.project.year}</p>
                <p className="b2">{item.year}</p>
              </div>
            </div>
            <div className={styles.bottomInfo}>
              <h4 className="h4">{item.title}</h4>
            </div>
          </div>
        </div>

        {/* Summary */}
        {item.summary && item.summary.length > 0 && (
          <div className={`${styles.wrap} ${styles.summary}`}>
            <div className={styles.left}>
              <p className="b2">{t.project.summary}</p>
            </div>
            <div className={styles.right}>
              {item.summary.map((s, i) => (
                <p key={i} className="p3">
                  {s}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Strategy */}
        {item.strategy && item.strategy.length > 0 && (
          <div className={`${styles.wrap} ${styles.strategy}`}>
            <div className={styles.left}>
              <p className="b2">{t.project.strategy}</p>
            </div>
            <div className={styles.right}>
              {item.strategy.map((st, i) => (
                <div
                  key={i}
                  className={`${styles.list} list-item ${activeAccordion === i ? styles.active : ''}`}
                >
                  <div
                    className={styles.listTitle}
                    onClick={() => toggleAccordion(i)}
                    onMouseEnter={playHoverSound}
                  >
                    <p className="p1">{st.title}</p>
                    <span>
                      <svg viewBox="0 0 19 23" fill="none">
                        <path
                          d="M9.77 22.05L0.53 12.81V9.18L8.42 17.07V0.75H11.12V17.07L19.01 9.18V12.81L9.77 22.05Z"
                          fill="#010101"
                        />
                      </svg>
                    </span>
                  </div>
                  <div className={`list-content ${styles.listContent}`}>
                    <div className={styles.listContentText}>
                      <div className="p3">{st.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {item.results && item.results.length > 0 && (
          <div className={`${styles.wrap} ${styles.results}`}>
            <div className={styles.left}>
              <p className="b2">{t.project.results}</p>
            </div>
            <div className={styles.right}>
              {item.results.map((r, i) => (
                <div key={i} className={styles.resultItem}>
                  <h2 className={`${styles.resultTitle} h2`}>{r.title}</h2>
                  <div className={styles.resultText}>
                    <p className="b2">{r.subtitle}</p>
                    <p className="p4">{r.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description text */}
        {item.text && (
          <div className={`${styles.description} p1`}>{item.text}</div>
        )}

        {/* Review */}
        {item.review && (
          <div className={styles.review}>
            <p className="p3">&ldquo;</p>
            <p className="p3">{item.review.text}</p>
            <div className={styles.reviewInfo}>
              <div className={styles.reviewPhoto}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.review.photo}
                  alt={item.review.name}
                />
              </div>
              <div className={styles.reviewText}>
                <p className="p1">{item.review.name}</p>
                <p className="p4">{item.review.position}</p>
              </div>
            </div>
          </div>
        )}

        <div className={styles.btnWrap}>
          <ButtonDefault text={`${t.lets_talk} ☕️`} />
        </div>
      </div>
    </div>
  )
}
