import { servicesData } from '@/data/strings'
import styles from './Info.module.scss'

export default function ServicesInfo() {
  return (
    <section className={styles.info}>
      <h2 className={`${styles.title} h2`}>{servicesData.title}</h2>
      <div className={styles.list}>
        {servicesData.list.map((item, i) => (
          <div key={i} className={styles.item}>
            <h3 className={`${styles.itemTitle} h3`}>{item.title}</h3>
            <ul className={styles.itemList}>
              {item.items.map((sub, j) => (
                <li key={j} className="p2">{sub}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
