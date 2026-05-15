'use client'

import { useState } from 'react'
import { t, footerData } from '@/data/strings'
import { useSound } from '@/hooks/useSound'
import { useUi } from '@/components/providers/UiProvider'
import ButtonInner from './ButtonInner'
import IconInstagram from '@/components/icon/Instagram'
import IconTelegram from '@/components/icon/Telegram'
import IconLinkedin from '@/components/icon/Linkedin'
import IconYoutube from '@/components/icon/Youtube'
import IconName from '@/components/icon/Name'
import styles from './Footer.module.scss'

export default function Footer() {
  const { playHoverSound } = useSound()
  const { setIsContactPopupOpen } = useUi()
  const [year] = useState(() => new Date().getFullYear())
  const totalValue = '0.0000'
  const progress: number = 0

  return (
    <footer className={styles.footer}>
      <div className={styles.head}>
        <div className={styles.lang}>
          <a className={styles.langBtn}>
            <ButtonInner active bottom>EN</ButtonInner>
          </a>
          <a className={styles.langBtn}>
            <ButtonInner bottom>UA</ButtonInner>
          </a>
        </div>

        <div className={styles.infoWrap}>
          <div className={styles.info}>
            <button
              className={`${styles.formBtn} b2`}
              onClick={() => setIsContactPopupOpen(true)}
              onMouseEnter={playHoverSound}
            >
              {t.footer.form_button}
            </button>

            <a className={styles.emailBtn} href={`mailto:${footerData.email}`}>
              <ButtonInner bottom>{footerData.email}</ButtonInner>
            </a>

            <a className={styles.socBtn} href={footerData.instagram} target="_blank" rel="noreferrer">
              <ButtonInner bottom>
                <span className={styles.socIcon}>
                  <IconInstagram />
                </span>
              </ButtonInner>
            </a>
            <a className={styles.socBtn} href={footerData.telegram} target="_blank" rel="noreferrer">
              <ButtonInner bottom>
                <span className={styles.socIcon}>
                  <IconTelegram />
                </span>
              </ButtonInner>
            </a>
            <a className={styles.socBtn} href={footerData.linkedin} target="_blank" rel="noreferrer">
              <ButtonInner bottom>
                <span className={styles.socIcon}>
                  <IconLinkedin />
                </span>
              </ButtonInner>
            </a>
            <a className={styles.socBtn} href={footerData.youtube} target="_blank" rel="noreferrer">
              <ButtonInner bottom>
                <span className={styles.socIcon}>
                  <IconYoutube />
                </span>
              </ButtonInner>
            </a>
          </div>
        </div>

        <div className={styles.budget}>
          <button className={styles.budgetBtn} onMouseEnter={playHoverSound}>i</button>
          <span className={`${styles.budgetTitle} b2`}>{t.footer.budget_title}:</span>

          <div className={`${styles.budgetTotal} b2`}>
            <span
              className={styles.progress}
              style={{
                clipPath: `polygon(0 0, ${progress}% 0, ${progress}% 100%, 0 100%)`,
                background: progress === 100 ? '#9EDE12' : '#efe81b',
              }}
            >
              <span className="currency">$</span>
              <span className="price">{totalValue}</span>
            </span>
            <span className="currency">$</span>
            <span className="price">{totalValue}</span>
          </div>
        </div>

        <div className={styles.name}>
          <IconName />
        </div>
      </div>

      <div className={styles.foot}>
        <div className={styles.footWrap}>
          <div className={styles.left}>
            <div className="copyright b2">
              ©{year}. {t.footer.copyright}
            </div>

            <div className="docs">
              <a className="hover-line-show b2" href={footerData.terms} target="_blank" rel="noreferrer">
                {t.footer.terms}
              </a>
              ,{' '}
              <a className="hover-line-show b2" href={footerData.privacy} target="_blank" rel="noreferrer">
                {t.footer.policy}
              </a>
            </div>
          </div>

          <div className={styles.right}>
            <p className={`b2 ${styles.rightText1}`}>{t.footer.dev_title}</p>
            <span className={`b2 ${styles.rightText2}`}>/</span>
            <div className={styles.developed}>
              <span className={`b2 ${styles.developedBy}`}>{t.footer.dev_by}: </span>
              <a
                href="https://thefirstthelast.agency/?utm_source=SAMI&utm_medium=article&utm_campaign=promo"
                target="_blank"
                rel="noreferrer"
                className="hover-line-show"
              >
                <span className="b2">THEFIRSTTHELAST </span>
                <svg viewBox="0 0 19 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M15.618 8.84567C17.1614 8.06071 17.9334 7.06774 17.9334 6.1122C17.9334 5.29918 17.3798 4.46147 16.2473 3.73722C15.1516 3.03657 13.5916 2.49919 11.7647 2.25613L11.7647 3.25254L10.4926 3.25254L10.4926 0.191641L11.7647 0.191641L11.7647 1.21386L11.7658 1.20526C13.7667 1.45396 15.5416 2.0402 16.8323 2.86563C18.1128 3.68449 19.001 4.80037 19.001 6.1122C19.001 7.65251 17.7839 8.91911 16.1113 9.76976C14.4128 10.6336 12.1033 11.1523 9.58162 11.1523C7.0599 11.1523 4.75044 10.6336 3.05191 9.76975C1.37937 8.91911 0.162266 7.65251 0.162266 6.1122C0.162266 4.80037 1.0504 3.68449 2.3309 2.86562C3.6015 2.05309 5.34117 1.47233 7.3038 1.21716L7.3038 0.191641L8.57595 0.191641L8.57595 3.25254L7.3038 3.25254L7.3038 2.26903C5.51773 2.51786 3.99262 3.04872 2.91597 3.73722C1.78342 4.46147 1.22984 5.29918 1.22984 6.1122C1.22984 7.06774 2.00184 8.06071 3.54524 8.84567C5.06266 9.61742 7.19598 10.1103 9.58162 10.1103C11.9673 10.1103 14.1006 9.61742 15.618 8.84567Z"
                    fill="#010101"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.logo} />
    </footer>
  )
}
