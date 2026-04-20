import './globals.css'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { DM_Sans, Instrument_Serif } from 'next/font/google'
import AuthSessionProvider from '@/components/AuthSessionProvider'
import RouteTopLoader from '@/components/RouteTopLoader'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

export const viewport: Viewport = {
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Scopo — Business Intelligence at a URL',
  description: 'Look up any business instantly. Paste a URL, get a full intelligence profile.',
  icons: {
    icon: [{ url: '/scopo-mark.svg', type: 'image/svg+xml' }],
    apple: '/scopo-mark.svg',
  },
}

/** Inline so design tokens exist even if `/_next` CSS chunks fail or load out of order in dev. */
const criticalRootCss = `:root {
  --layout-max: 1280px;
  --layout-min: 320px;
  --layout-fluid: 70vw;
  --bg: #0a0a08;
  --bg-2: #111110;
  --bg-3: #1a1a18;
  --surface: #1e1e1c;
  --border: rgba(255,255,255,0.08);
  --border-hover: rgba(255,255,255,0.16);
  --text: #f0ede6;
  --text-muted: #888880;
  --text-dim: #555550;
  --accent: #c8f04a;
  --accent-dim: rgba(200, 240, 74, 0.12);
  --accent-hover: #d6f766;
  --serif: var(--font-instrument-serif), Georgia, serif;
  --sans: var(--font-dm-sans), system-ui, sans-serif;
}`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${instrumentSerif.variable}`}
      style={{ colorScheme: 'dark', backgroundColor: '#0a0a08' }}
    >
      <body
        className={dmSans.className}
        style={{
          margin: 0,
          minHeight: '100vh',
          backgroundColor: '#0a0a08',
          color: '#f0ede6',
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: criticalRootCss }} />
        <RouteTopLoader />
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  )
}
