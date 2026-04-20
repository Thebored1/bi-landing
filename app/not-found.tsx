import Link from 'next/link'

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        background: '#0a0a08',
        color: '#f0ede6',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Page not found</h1>
      <p style={{ margin: 0, fontSize: 14, color: '#888880' }}>That URL does not exist.</p>
      <Link href="/" style={{ color: '#c8f04a', fontSize: 15, fontWeight: 600 }}>
        Back to home
      </Link>
    </main>
  )
}
