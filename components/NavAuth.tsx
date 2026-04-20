'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './Nav.module.css'

export default function NavAuth() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu()
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen, closeMenu])

  if (status === 'loading') {
    return (
      <div className={styles.authLoading} aria-busy="true" aria-label="Loading account">
        <span className={styles.authLoadingDot} />
        <span className={styles.authLoadingDot} />
      </div>
    )
  }

  if (status === 'authenticated' && session?.user) {
    const name = session.user.name ?? 'Account'
    const image = session.user.image

    return (
      <div className={styles.authUser}>
        {pathname !== '/dashboard' ? (
          <Link href="/dashboard" className={styles.dashboard}>
            Dashboard
          </Link>
        ) : null}
        <div className={styles.profileMenu} ref={menuRef}>
          <button
            type="button"
            className={styles.avatarBtn}
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={`Account menu for ${name}`}
          >
            {image ? (
              <Image
                src={image}
                alt=""
                width={24}
                height={24}
                className={styles.avatarImg}
                sizes="24px"
              />
            ) : (
              <span className={styles.avatarFallback} aria-hidden>
                {name.trim().slice(0, 1).toUpperCase() || '?'}
              </span>
            )}
          </button>
          {menuOpen ? (
            <div className={styles.profileDropdown} role="menu">
              <button
                type="button"
                role="menuitem"
                className={styles.profileLogout}
                onClick={() => {
                  closeMenu()
                  void signOut({ callbackUrl: '/' })
                }}
              >
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <>
      <Link href="/login" className={styles.login}>
        Log in
      </Link>
      <Link href="/register" className={styles.signup}>
        Get started
      </Link>
    </>
  )
}
