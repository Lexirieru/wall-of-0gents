import { feedbackData } from '@/data/strings'
import styles from './Hero.module.scss'

export default function FeedbackHero() {
  return (
    <div className={styles.hero}>
      <h2 className={`${styles.title} h2`}>{feedbackData.title}</h2>
    </div>
  )
}
