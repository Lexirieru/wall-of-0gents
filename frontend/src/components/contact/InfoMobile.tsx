'use client'

import { contactData, t } from '@/data/strings'
import { useUi } from '@/components/providers/UiProvider'
import ButtonDefault from '@/components/common/ButtonDefault'
import styles from './InfoMobile.module.scss'

export default function ContactInfoMobile() {
  const { setIsContactPopupOpen } = useUi()
  return (
    <section className={`${styles.info} contact-trigger`}>
      <h2 className={`${styles.title} h2`}>{contactData.title}</h2>
      <p className={`${styles.subtitle} p2`}>{contactData.text}</p>
      <div className={styles.contactInfo}>
        <p className="p3">
          <span>{t.mail}: </span>
          <a className="hover-line-show" href={`mailto:${contactData.email}`}>
            {contactData.email}
          </a>
        </p>
        <p className="p3">
          <span>{t.address}: </span>
          {contactData.address}
        </p>
      </div>
      <button onClick={() => setIsContactPopupOpen(true)} className={styles.btn}>
        <ButtonDefault text={t.lets_talk} />
      </button>
      <div className="logo-trigger" />
    </section>
  )
}
