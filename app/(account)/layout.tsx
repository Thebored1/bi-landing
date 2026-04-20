import type { ReactNode } from 'react'

/** Session lives in root `AuthSessionProvider` so Nav can read it on every route. */
export default function AccountLayout({ children }: { children: ReactNode }) {
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
