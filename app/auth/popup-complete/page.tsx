'use client'

import { useEffect, useState } from 'react'
import styles from './popup-complete.module.css'

/**
 * OAuth redirect target for popup flow. NextAuth sets the session cookie, then
 * we notify the opener and close so the user never keeps a tiny duplicate app window.
 */
export default function AuthPopupCompletePage() {
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    const origin = window.location.origin
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'scopo-auth-complete' }, origin)
        window.close()
        return
      }
    } catch {
      // opener may be cross-origin in edge cases
    }
    setRedirecting(true)
    window.location.replace('/dashboard')
  }, [])

  return <div className={styles.center}>{redirecting ? 'Redirecting to dashboard…' : 'Finishing sign-in…'}</div>
}
