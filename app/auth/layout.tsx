import type { ReactNode } from 'react'

/** Auth routes segment — global CSS comes from `app/layout.tsx` only. */
export default function AuthSegmentLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a08',
        color: '#f0ede6',
      }}
    >
      {children}
    </div>
  )
}
