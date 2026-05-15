import { aboutDetails } from '@/data/strings'
import styles from './Team.module.scss'

export default function AboutTeam() {
  return (
    <section className={styles.team}>
      <h2 className={`${styles.title} h2`}>Team</h2>
      <div className={styles.grid}>
        {aboutDetails.team.map((m, i) => (
          <div key={i} className={styles.member}>
            <div className={styles.photo}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.photo} alt={m.name} />
            </div>
            <h3 className={`${styles.name} h4`}>{m.name}</h3>
            <p className={`${styles.role} p3`}>{m.role}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
