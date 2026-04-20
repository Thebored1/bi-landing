'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const chunkCacheCorrupt =
    typeof error.message === 'string' &&
    error.message.includes('Cannot find module') &&
    /\.[/\\]\d+\.js/.test(error.message)

  return (
    <div
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
      <p style={{ margin: 0, fontSize: 14, color: '#888880' }}>This page failed to render.</p>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Something went wrong</h1>
      {error.digest ? (
        <p style={{ margin: 0, fontSize: 12, color: '#555550' }}>Reference: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        style={{
          marginTop: 8,
          padding: '10px 20px',
          borderRadius: 8,
          border: 'none',
          background: '#c8f04a',
          color: '#0a0a08',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
      {chunkCacheCorrupt ? (
        <p style={{ margin: 0, fontSize: 13, color: '#555550', maxWidth: 480, textAlign: 'center', lineHeight: 1.5 }}>
          This is a <strong style={{ color: '#f0ede6' }}>stale or broken `.next` dev cache</strong> (bundler chunk). The stack
          often names <code style={{ color: '#c8f04a' }}>api/auth/[...nextauth]</code> — that route is fine; the numbered file
          (e.g. <code style={{ color: '#c8f04a' }}>276.js</code>) is missing from disk after a rebuild. Stop{' '}
          <em>all</em> Node processes serving this repo, then run <code style={{ color: '#c8f04a' }}>npm run dev</code>{' '}
          (cleans then starts the dev server). Avoid running two dev servers on the same folder.
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: '#555550', maxWidth: 440, textAlign: 'center', lineHeight: 1.5 }}>
          Recurring blank page in dev is often a stale build cache. Stop the server, run{' '}
          <code style={{ color: '#c8f04a' }}>npm run dev</code>, then hard-refresh the browser.
        </p>
      )}
    </div>
  )
}
