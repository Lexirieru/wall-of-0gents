import { worksData } from '@/data/strings'
import styles from './Hero.module.scss'

export default function WorksHero() {
  return (
    <section className={styles.works}>
      <h2 className={`${styles.title} h2`}>{worksData.title}</h2>
      <div className={styles.grid}>
        {worksData.items.map((item, i) => (
          <article key={i} className={styles.item}>
            <div className={styles.photo}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt={item.title} />
            </div>
            <h3 className={`${styles.itemTitle} h3`}>{item.title}</h3>
            <p className={`${styles.tag} p3`}>{item.tag}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
