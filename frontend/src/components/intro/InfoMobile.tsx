'use client'

import { introInfoData, t } from '@/data/strings'
import { useUi } from '@/components/providers/UiProvider'
import ButtonDefault from '@/components/common/ButtonDefault'
import styles from './InfoMobile.module.scss'

export default function IntroInfoMobile() {
  const { setIsContactPopupOpen } = useUi()
  return (
    <section className={`${styles.infoMob} info-mob`}>
      <div className={`${styles.wrap} wrap`}>
        <h2 className={`${styles.title} h2`}>{introInfoData.title}</h2>
      </div>
      <div className={`${styles.description} description`}>
        <p className="p3">{introInfoData.text}</p>
      </div>
      <div className={`${styles.cube} cube`}>
        <p className="b2">{introInfoData.cube.text}</p>
      </div>
      <div className={`${styles.vision} vision`}>
        <p className="h3">{introInfoData.vision.text}</p>
        <button onClick={() => setIsContactPopupOpen(true)}>
          <ButtonDefault text={t.get_in_touch + '✌'} />
        </button>
      </div>
    </section>
  )
}
