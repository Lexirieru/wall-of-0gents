import { servicesData } from '@/data/strings'
import styles from './InfoMobile.module.scss'

export default function ServicesInfoMobile() {
  return (
    <section className={styles.info}>
      <h2 className={`${styles.title} h2`}>{servicesData.title}</h2>
      {servicesData.list.map((item, i) => (
        <div key={i} className={styles.item}>
          <h3 className={`${styles.itemTitle} h4`}>{item.title}</h3>
          <ul className={styles.itemList}>
            {item.items.map((sub, j) => (
              <li key={j} className="p3">{sub}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
