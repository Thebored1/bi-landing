import NavAuth from './NavAuth'
import styles from './Nav.module.css'
import Link from 'next/link'

export default function Nav() {
  return (
    <nav className={styles.nav}>
      <div className={styles.shell}>
        <div className={styles.inner}>
          <Link href="/" className={styles.logo} aria-label="Scopo home">
            <img
              src="/scopo-mark.svg"
              alt=""
              width={28}
              height={28}
              className={styles.logoMark}
            />
            <span className={styles.logoText}>Scopo</span>
          </Link>
          <div className={styles.actions}>
            <NavAuth />
          </div>
        </div>
      </div>
    </nav>
  )
}
