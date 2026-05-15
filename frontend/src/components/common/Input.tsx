'use client'
import { useState, ChangeEvent } from 'react'
import Line from './Line'
import styles from './Input.module.scss'

type Props = {
  type: string
  placeholder: string
  name: string
  value?: string
  onChange?: (val: string) => void
}

export default function Input({ type, placeholder, name, value = '', onChange }: Props) {
  const [val, setVal] = useState(value)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value
    if (name === 'phone') v = v.replace(/\D/g, '')
    setVal(v)
    onChange?.(v)
  }

  return (
    <div className={styles.inputWrap}>
      <input
        className={styles.input}
        type={type}
        name={name}
        value={val}
        placeholder={placeholder}
        autoComplete={name}
        onChange={handleChange}
      />
      <Line />
    </div>
  )
}
