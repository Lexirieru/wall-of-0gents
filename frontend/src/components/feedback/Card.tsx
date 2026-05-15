'use client'
import { useSound } from '@/hooks/useSound'
import { feedbackData, t } from '@/data/strings'
import styles from './Card.module.scss'

type Props = { index: number }

export default function FeedbackCard({ index }: Props) {
  const { playHoverSound, playClickSound } = useSound()
  const review = feedbackData.reviews[index % feedbackData.reviews.length]

  return (
    <div className={styles.item} data-area-for-tip={t.drag_read}>
      <p className={`${styles.title} b3`}>{t.feedback}</p>
      <p className={`${styles.count} b3`}>{String(index + 1).padStart(2, '0')}</p>
      <div className={styles.photo}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.innerImg} src="/images/photo-decor.png" alt={review.author} />
      </div>
      <p className={`${styles.name} p1`}>{review.author}</p>
      <p className={`${styles.spec} p4`}>{review.role}</p>
      <div className={styles.socials}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <a href="#" target="_blank" rel="noreferrer" onMouseEnter={playHoverSound} onClick={playClickSound}>
          <img src="/images/soc-ig.svg" alt="instagram" />
        </a>
      </div>
      <div className={styles.description}>
        <p className="p1">&ldquo;</p>
        <p className="p3">{review.text}</p>
      </div>
    </div>
  )
}
