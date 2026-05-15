import { monopolyData } from '@/data/strings'
import IconMonopolyDecor from '@/components/icon/MonopolyDecor'
import IconMonopolyLogo from '@/components/icon/MonopolyLogo'
import styles from './Hero.module.scss'

export default function MonopolyHero() {
  return (
    <section className={styles.monopoly}>
      <div className={styles.decor}>
        <IconMonopolyDecor />
      </div>
      <h2 className={`${styles.title} h2`}>{monopolyData.title}</h2>
      <p className={`${styles.description} p1`}>{monopolyData.description}</p>
      <div className={styles.logo}>
        <IconMonopolyLogo />
      </div>
    </section>
  )
}
