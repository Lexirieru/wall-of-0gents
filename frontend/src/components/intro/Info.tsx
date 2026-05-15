'use client'

import { introInfoData, t } from '@/data/strings'
import { useUi } from '@/components/providers/UiProvider'
import ButtonDefault from '@/components/common/ButtonDefault'
import Cube from './Cube'
import styles from './Info.module.scss'

export default function IntroInfo() {
  const { setIsContactPopupOpen } = useUi()
  const titleWords = introInfoData.title.split(' ')

  return (
    <section className={`${styles.info} info`}>
      <div className={styles.wrap}>
        <h2 className={`${styles.title} h2`}>
          {titleWords.map((word, i) => (
            <span className={styles.titleRow} key={i}>
              <span className={styles.titleWord}>
                <span className={styles.titleMask}>{word}</span>
              </span>
            </span>
          ))}
        </h2>
      </div>

      <div className={styles.cubeWrap}>
        <div className={`${styles.cubeText} p3`}>{introInfoData.text}</div>
        <div className={styles.cube}>
          <Cube />
        </div>
      </div>

      <div className={styles.vision}>
        <div className={`${styles.title2} h3`}>{introInfoData.vision.text}</div>
        <div className={styles.description2}>
          <p className="p3">{introInfoData.text}</p>
        </div>
        <div className={styles.btnWrap}>
          <button onClick={() => setIsContactPopupOpen(true)}>
            <ButtonDefault text={t.get_in_touch + '✌'} />
          </button>
        </div>
      </div>
    </section>
  )
}
