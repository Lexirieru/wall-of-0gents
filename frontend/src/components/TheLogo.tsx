import IconLogo from './icon/Logo'
import styles from './TheLogo.module.scss'

export default function TheLogo() {
  return (
    <div className={`${styles.fixedLogo} fixed-logo`}>
      <IconLogo />
    </div>
  )
}
