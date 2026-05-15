import { monopolyData } from '@/data/strings'
import IconMonopolyLogo from '@/components/icon/MonopolyLogo'
import styles from './HeroMobile.module.scss'

export default function MonopolyHeroMobile() {
  return (
    <section className={styles.monopoly}>
      <h2 className={`${styles.title} h2`}>{monopolyData.title}</h2>
      <p className={`${styles.description} p2`}>{monopolyData.description}</p>
      <div className={styles.logo}>
        <IconMonopolyLogo />
      </div>
    </section>
  )
}
