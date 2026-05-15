'use client'
import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import ButtonClose from '@/components/common/ButtonClose'
import ButtonDefault from '@/components/common/ButtonDefault'
import Line from '@/components/common/Line'
import Input from '@/components/common/Input'
import Select from '@/components/common/Select'
import Textarea from '@/components/common/Textarea'
import ContactThanks from './Thanks'
import { t } from '@/data/strings'
import { useLockScroll } from '@/hooks/useLockScroll'
import styles from './Popup.module.scss'

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

type FormData = {
  name: string
  company: string
  email: string
  message: string
  discuss: string
  knowing: string
  phone: string
  telegram: string
}

type Props = { onClose: () => void }

export default function ContactPopup({ onClose }: Props) {
  const popupRef = useRef<HTMLDivElement>(null)
  const [userTime, setUserTime] = useState('')
  const [ownerTime, setOwnerTime] = useState('')
  const [timestamp, setTimestamp] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState<FormData>({
    name: '',
    company: '',
    email: '',
    message: '',
    discuss: '',
    knowing: '',
    phone: '',
    telegram: '',
  })

  useLockScroll(true)

  const discussOptions = ['Brand Strategy', 'Identity Design', 'Website', 'Motion', 'Sound', 'Other']
  const knowingOptions = ['Social Media', 'Referral', 'Google', 'Event', 'Other']

  const updateTimes = () => {
    const now = new Date()
    setUserTime(formatTime(now))
    const ownerDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kiev' }))
    setOwnerTime(formatTime(ownerDate))
  }

  useEffect(() => {
    updateTimes()
    setTimestamp(formatTime(new Date()))

    gsap.fromTo(
      popupRef.current,
      { clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)' },
      { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', duration: 0.75 },
    )

    const interval = setInterval(updateTimes, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleClose = () => {
    gsap.to(popupRef.current, {
      clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)',
      duration: 0.75,
      onComplete: onClose,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    gsap.to(`.${styles.blur}`, { opacity: 1, duration: 0.5 })
    gsap.to(`.${styles.body}`, { scale: 0.7, duration: 1.2 })
    gsap.set(`.${styles.thanks}`, { autoAlpha: 1 })
    gsap.to(`.${styles.thanks}`, { y: 0, duration: 1.2 })
  }

  const setField = (k: keyof FormData) => (v: string) =>
    setForm(f => ({ ...f, [k]: v }))

  return (
    <div ref={popupRef} className={styles.contactPopup} data-lenis-prevent="">
      <div className={styles.head}>
        <p className="b2">{t.form.your_time}: {userTime}</p>
        <p className="b2">{t.form.our_time}: {ownerTime}</p>
        <p className="b2">{t.form.lets_connect}!</p>
        <div className={styles.closeWrap}>
          <ButtonClose onClick={handleClose} />
        </div>
      </div>
      <form className={styles.body} onSubmit={handleSubmit}>
        <div className={styles.blur} />
        <div className={styles.left}>
          <Line vertical />
          <div className={styles.leftTop}>
            <div className={styles.row}>
              <p className="p1">{t.form.hi_my_name_is}</p>
              <div className={styles.field}>
                <Input
                  type="text"
                  placeholder={`${t.form.your_name}*`}
                  name="name"
                  onChange={setField('name')}
                />
              </div>
              <p className="p1">,</p>
            </div>
            <div className={styles.row}>
              <p className="p1">{t.form.and_i_work_at}</p>
              <div className={styles.field}>
                <Input
                  type="text"
                  placeholder={`${t.form.your_company_name}*`}
                  name="company"
                  onChange={setField('company')}
                />
              </div>
              <p className="p1">.</p>
            </div>
            <div className={styles.row}>
              <p className="p1">{t.form.reaching_out_to_discuss}</p>
              <div className={styles.field}>
                <Select
                  name="discuss"
                  options={discussOptions}
                  placeholder={t.form.select}
                  onChange={setField('discuss')}
                />
              </div>
              <p className="p1">.</p>
            </div>
            <div className={styles.row}>
              <p className="p1">{t.form.i_know_you}</p>
              <div className={styles.field}>
                <Select
                  name="knowing"
                  options={knowingOptions}
                  placeholder={t.form.select}
                  onChange={setField('knowing')}
                />
              </div>
            </div>
            <div className={`${styles.row} ${styles.rowTextarea}`}>
              <p className="p1">{t.form.in_short},</p>
              <div className={styles.field}>
                <Textarea
                  placeholder={t.form.message_to_us}
                  name="message"
                  onChange={setField('message')}
                />
              </div>
            </div>
          </div>
          <div className={styles.leftBottom}>
            <div className={styles.row}>
              <p className="p1">{t.form.reach_me_at}</p>
              <div className={styles.field}>
                <Input
                  type="email"
                  placeholder={`${t.form.your_email}*`}
                  name="email"
                  onChange={setField('email')}
                />
              </div>
            </div>
            <div className={`${styles.row} ${styles.rowTgPhone}`}>
              <div className={styles.field}>
                <Input
                  type="text"
                  placeholder={t.form.your_phone}
                  name="phone"
                  onChange={setField('phone')}
                />
              </div>
              <p className="p1">,</p>
              <div className={styles.field}>
                <Input
                  type="text"
                  placeholder={t.form.your_telegram}
                  name="telegram"
                  onChange={setField('telegram')}
                />
              </div>
            </div>
            <div className={styles.row}>
              <p className="p1">{t.form.looking_forward}!</p>
            </div>
          </div>
          <button type="submit">
            <ButtonDefault text="Submit 🕊" />
          </button>
        </div>
        <div className={styles.right}>
          <Line />
          <p className="p4">Timestamp: {timestamp}</p>
          <div className={styles.deliver}>
            <p className="p2">To:</p>
            <div className={styles.deliverPhoto}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.photoDecor} src="/images/photo-decor.png" alt="" />
            </div>
            <div className={styles.deliverInfo}>
              <p className="p2">Wall of 0gents</p>
              <p className="p4">hello@wall-of-0gents.xyz</p>
            </div>
          </div>
          <div className={styles.contactInfo}>
            <p className="p4">Remote · Global</p>
            <p className="p4">
              Email:{' '}
              <a href="mailto:hello@wall-of-0gents.xyz">hello@wall-of-0gents.xyz</a>
            </p>
          </div>
          <button type="submit">
            <ButtonDefault text="Submit 🕊" />
          </button>
        </div>
        <ContactThanks />
      </form>
    </div>
  )
}
