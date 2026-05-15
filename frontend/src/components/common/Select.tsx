'use client'
import { useState, useRef, useEffect } from 'react'
import Arrow from '@/components/icon/Arrow'
import Check from '@/components/icon/Check'
import styles from './Select.module.scss'

type Props = {
  name: string
  options: string[]
  placeholder: string
  value?: string
  onChange?: (val: string) => void
}

export default function Select({ name, options, placeholder, value = '', onChange }: Props) {
  const [selected, setSelected] = useState(value)
  const [isOpen, setIsOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const selectOption = (opt: string) => {
    setSelected(opt)
    setIsOpen(false)
    onChange?.(opt)
  }

  return (
    <div
      ref={wrapRef}
      className={[styles.selectWrap, isOpen ? styles.opened : ''].filter(Boolean).join(' ')}
    >
      <input type="hidden" name={name} value={selected} />
      <div className={styles.select} onClick={() => setIsOpen(v => !v)}>
        <span className={styles.decor}>(</span>
        <span className={styles.selected}>
          <span className={`${styles.title} p2`}>{selected || placeholder}</span>
          <span className={styles.arrow}><Arrow /></span>
        </span>
        <span className={styles.decor}>)</span>
      </div>
      {isOpen && (
        <ul className={styles.dropdown}>
          {options.map(opt => (
            <li
              key={opt}
              className={[styles.option, 'p2', selected === opt ? styles.selectedOption : ''].filter(Boolean).join(' ')}
              onClick={() => selectOption(opt)}
            >
              <span className={styles.optionText}>{opt}</span>
              <span className={styles.optionCheck}><Check /></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
