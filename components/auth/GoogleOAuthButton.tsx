'use client'

import { signIn } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './GoogleOAuthButton.module.css'

const POPUP_PATH = '/auth/popup-complete'

type Props = {
  label: string
}

/** NextAuth `signIn(..., { redirect: false })` error codes — see server terminal for full stack. */
function signInFailureMessage(code: string, status?: number): string {
  const tail = status ? ` (HTTP ${status})` : ''
  switch (code) {
    case 'Configuration':
      return `Auth misconfiguration${tail}. Set NEXTAUTH_SECRET in .env.local, and valid GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. Restart the dev server after editing env.`
    case 'AccessDenied':
      return 'Google sign-in was denied or cancelled.'
    default:
      return `Could not start Google sign-in: ${code}${tail}. Confirm OAuth client is type “Web application”, redirect URI is exactly {your origin}/api/auth/callback/google (same port as the URL in your browser), and NEXTAUTH_URL in .env.local matches that origin.`
  }
}

function popupFeatures() {
  const w = 520
  const h = 640
  const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2)
  const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2)
  return `popup=yes,width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`
}

export default function GoogleOAuthButton({ label }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, setPending] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [signInError, setSignInError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => {
    setSignInError(null)
    setBlocked(false)
    setPending(false)
    clearPoll()
  }, [pathname, clearPoll])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'scopo-auth-complete') return
      clearPoll()
      setSignInError(null)
      setPending(false)
      setBlocked(false)
      router.refresh()
      router.push('/')
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [clearPoll, router])

  useEffect(() => () => clearPoll(), [clearPoll])

  async function openGooglePopup() {
    setBlocked(false)
    setSignInError(null)
    setPending(true)
    try {
      const result = await signIn('google', {
        callbackUrl: POPUP_PATH,
        redirect: false,
      })
      if (result?.error) {
        setSignInError(signInFailureMessage(result.error, result.status))
        setPending(false)
        return
      }
      const url = result?.url
      if (!url) {
        // NextAuth often returns no `url` without `result.error` (session refresh / race). Do not show
        // the old “missing .env” copy — it flashes even when OAuth is configured correctly.
        setPending(false)
        router.refresh()
        return
      }
      const popup = window.open(url, 'scopo_google_oauth', popupFeatures())
      if (!popup) {
        setBlocked(true)
        setPending(false)
        return
      }
      popup.focus()
      clearPoll()
      pollRef.current = setInterval(() => {
        if (popup.closed) {
          clearPoll()
          setPending(false)
        }
      }, 400)
    } catch {
      setPending(false)
    }
  }

  return (
    <div className={styles.stack}>
      <button
        type="button"
        spellCheck={false}
        disabled={pending}
        onClick={() => void openGooglePopup()}
        className={styles.btn}
      >
        {/* Fixed pixel size avoids oversized vector artwork in some engines */}
        <span className={styles.iconWrap} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
        </span>
        <span className={styles.label}>{pending ? 'Opening Google…' : label}</span>
      </button>
      {blocked ? (
        <p className={styles.hint} role="status">
          Pop-up was blocked. Allow pop-ups for this site and try again.
        </p>
      ) : null}
      {signInError ? (
        <p className={styles.err} role="alert">
          {signInError}
        </p>
      ) : null}
    </div>
  )
}
