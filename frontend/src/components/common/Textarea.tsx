'use client'
import { useState, useRef, useEffect, ChangeEvent } from 'react'
import Line from './Line'
import styles from './Textarea.module.scss'

type Props = {
  name: string
  placeholder: string
  value?: string
  onChange?: (val: string) => void
}

export default function Textarea({ name, placeholder, value = '', onChange }: Props) {
  const [val, setVal] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)
  const maxHeight = useRef(0)

  useEffect(() => {
    if (ref.current) maxHeight.current = ref.current.scrollHeight
  }, [])

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target
    if (target.scrollHeight > maxHeight.current + 10) {
      target.value = target.value.slice(0, -1)
      return
    }
    setVal(target.value)
    onChange?.(target.value)
  }

  return (
    <div className={styles.textareaWrap}>
      <textarea
        ref={ref}
        className={styles.textarea}
        name={name}
        value={val}
        placeholder={placeholder}
        onChange={handleInput}
        onPaste={e => e.preventDefault()}
      />
      <div className={styles.lines}>
        <Line />
        <Line />
        <Line />
        <Line />
      </div>
    </div>
  )
}
