import { feedbackData } from '@/data/strings'
import styles from './Reviews.module.scss'

export default function FeedbackReviews() {
  return (
    <div className={styles.reviews}>
      {feedbackData.reviews.map((r, i) => (
        <article key={i} className={styles.card}>
          <p className="p2">{r.text}</p>
          <p className={`${styles.author} p3-bold`}>{r.author}</p>
          <p className={`${styles.role} p3`}>{r.role}</p>
        </article>
      ))}
    </div>
  )
}
