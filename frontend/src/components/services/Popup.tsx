'use client'
import { useState } from 'react'
import { gsap } from 'gsap'
import ButtonClose from '@/components/common/ButtonClose'
import ButtonDefault from '@/components/common/ButtonDefault'
import { useSound } from '@/hooks/useSound'
import { useViewport } from '@/hooks/useViewport'
import { t } from '@/data/strings'
import styles from './Popup.module.scss'

const servicesDataFull = [
  {
    description2: 'We craft brand narratives that connect emotionally and drive decisions.',
    subServices: [
      {
        name: 'Brand Positioning',
        description: '<p>We define where your brand sits in the market and why it matters.</p>',
        mark: false,
      },
      {
        name: 'Naming & Tone',
        description: '<p>From name to tagline, we find your brand voice.</p>',
        mark: true,
      },
      {
        name: 'Messaging Architecture',
        description: '<p>A clear hierarchy of messages for every audience and channel.</p>',
        mark: false,
      },
    ],
  },
  {
    description2: 'Visual systems that carry meaning, flex across media, and age well.',
    subServices: [
      {
        name: 'Logo System',
        description: '<p>Primary, secondary, and responsive lockups.</p>',
        mark: false,
      },
      {
        name: 'Typography & Color',
        description: '<p>Type choices and palettes that communicate before a word is read.</p>',
        mark: true,
      },
      {
        name: 'Brand Guidelines',
        description: "<p>A living document your whole team can actually use.</p>",
        mark: false,
      },
    ],
  },
  {
    description2: 'Websites and web apps built with performance and delight in mind.',
    subServices: [
      {
        name: 'UX Design',
        description: '<p>User flows, wireframes, and prototypes that solve real problems.</p>',
        mark: false,
      },
      {
        name: 'Frontend Development',
        description: '<p>Clean, fast, accessible code.</p>',
        mark: true,
      },
      {
        name: 'WebGL & Interaction',
        description: '<p>3D, shaders, and immersive experiences for the right moments.</p>',
        mark: false,
      },
    ],
  },
  {
    description2: 'Motion and sound that make your brand feel alive.',
    subServices: [
      {
        name: 'Motion Design',
        description: '<p>Title animations, transitions, and brand moments.</p>',
        mark: false,
      },
      {
        name: 'Sonic Identity',
        description: '<p>Sounds that reinforce your brand at every touchpoint.</p>',
        mark: true,
      },
    ],
  },
]

type Props = {
  index: number
  activePopupIndex: number
  onClose: (i: number) => void
  onOpen: (i: number) => void
}

export default function ServicesPopup({ index, activePopupIndex, onClose, onOpen }: Props) {
  const { playHoverSound, playClickSound } = useSound()
  const { isDesktop } = useViewport()
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null)
  const service = servicesDataFull[index] ?? servicesDataFull[0]

  const toggleAccordion = (i: number) => {
    playClickSound()
    const contents = document.querySelectorAll(
      `.services-popup-${index} .${styles.itemContent}`,
    )
    if (activeAccordion === i) {
      gsap.to(contents[i], { height: 0 })
      setActiveAccordion(null)
    } else {
      if (activeAccordion !== null && contents[activeAccordion]) {
        gsap.to(contents[activeAccordion], { height: 0 })
      }
      gsap.to(contents[i], { height: 'auto' })
      setActiveAccordion(i)
    }
  }

  return (
    <div
      className={`${styles.popup} services-popup services-popup-${index}`}
    >
      {isDesktop && (
        <div
          className={styles.learnMoreWrap}
          onClick={() => {
            playClickSound()
            onOpen(index)
          }}
          onMouseEnter={playHoverSound}
        >
          <div className={`${styles.learnMore} b2`}>
            <span>{t.learn_more}</span>
            <span>
              <svg viewBox="0 0 10 14" fill="none">
                <path
                  d="M4.37159 12.9119V5.29587L0.689586 8.97787V7.28387L5.00159 2.97187L9.31359 7.28387V8.97787L5.63159 5.29587V12.9119H4.37159Z"
                  fill="#010101"
                />
              </svg>
            </span>
          </div>
        </div>
      )}
      <div className={styles.popupContent}>
        <div className={styles.closeWrap}>
          <ButtonClose onClick={() => onClose(index)} />
        </div>
        <div className={styles.popupTitle}>
          <h4 className="h4">{t.subservices}</h4>
        </div>
        <p className={`${styles.popupDescr} p4`}>{service.description2}</p>
        <p className={`${styles.popupInfo} p4`}>- {t.optional_service}</p>
        <div className={styles.popupItemsWrap}>
          <div className={styles.popupItems} data-lenis-prevent="">
            {service.subServices.map((sub, i) => (
              <div key={i} className={styles.popupItem}>
                <div
                  className={styles.popupItemTitle}
                  onClick={() => toggleAccordion(i)}
                  onMouseEnter={playHoverSound}
                >
                  <p className="p3">
                    {sub.name}
                    {sub.mark && <span className={styles.markDot} />}
                  </p>
                  <span>
                    <svg
                      className={styles.decor}
                      viewBox="0 0 10 10"
                      fill="none"
                    >
                      <path
                        d="M5 0V10"
                        stroke="black"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M10 5L-2.38419e-07 5"
                        stroke="black"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </span>
                </div>
                <div className={styles.itemContent}>
                  <div className="p4">{sub.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.popupBtn}>
          <ButtonDefault text={`${t.lets_talk} ✌`} />
        </div>
      </div>
    </div>
  )
}
