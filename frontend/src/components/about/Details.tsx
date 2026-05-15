import { aboutDetails } from '@/data/strings'
import styles from './Details.module.scss'

export default function AboutDetails() {
  return (
    <section className={styles.details}>
      <h2 className={`${styles.title} h2`}>{aboutDetails.title}</h2>
      <p className={`${styles.description} p1`}>{aboutDetails.description}</p>
      <div className={styles.grid}>
        {aboutDetails.facts.map((fact, i) => (
          <div key={i} className={styles.card}>
            <h3 className={`${styles.cardTitle} h4`}>{fact.title}</h3>
            <p className="p3">{fact.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
