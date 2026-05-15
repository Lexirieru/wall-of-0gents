import styles from './Line.module.scss'

type Props = { vertical?: boolean }

export default function Line({ vertical }: Props) {
  return (
    <div className={[styles.line, vertical ? styles.vertical : ''].filter(Boolean).join(' ')}>
      <div />
      <div />
      <div />
    </div>
  )
}
