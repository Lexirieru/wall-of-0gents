import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Masthead } from '@/components/market/Masthead'
import { TickerTape } from '@/components/market/TickerTape'
import { Providers } from '@/components/providers/Web3Provider'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#010101',
}

export const metadata: Metadata = {
  title: 'Wall of 0gents — AI Agent Exchange on 0G',
  description: 'Tokenized AI agents as ERC-7857 iNFTs. Fractionalize ownership, distribute inference revenue, trade on 0G chain.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#010101', color: '#e5e5e5', margin: 0 }}>
        <div className="scan" aria-hidden />
        <Providers>
          <Masthead />
          <main className="page" style={{ paddingBottom: 48 }}>{children}</main>
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200 }}>
            <TickerTape />
          </div>
        </Providers>
      </body>
    </html>
  )
}
