'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type UiContextValue = {
  preloaderDone: boolean
  setPreloaderDone: (v: boolean) => void
  isMenuOpen: boolean
  setIsMenuOpen: (v: boolean) => void
  isContactPopupOpen: boolean
  setIsContactPopupOpen: (v: boolean) => void
  isVideoPopupOpen: boolean
  setIsVideoPopupOpen: (v: boolean) => void
}

const UiContext = createContext<UiContextValue | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [preloaderDone, setPreloaderDone] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isContactPopupOpen, setIsContactPopupOpen] = useState(false)
  const [isVideoPopupOpen, setIsVideoPopupOpen] = useState(false)

  return (
    <UiContext.Provider
      value={{
        preloaderDone,
        setPreloaderDone,
        isMenuOpen,
        setIsMenuOpen,
        isContactPopupOpen,
        setIsContactPopupOpen,
        isVideoPopupOpen,
        setIsVideoPopupOpen,
      }}
    >
      {children}
    </UiContext.Provider>
  )
}

export function useUi() {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi must be used within UiProvider')
  return ctx
}
