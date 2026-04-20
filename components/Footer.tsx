import Container from './Container'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.inner}>
          <div className={styles.left}>
            <a href="/" className={styles.brand} aria-label="Scopo home">
              <img
                src="/scopo-mark.svg"
                alt=""
                width={22}
                height={22}
                className={styles.brandMark}
              />
              <span className={styles.brandName}>Scopo</span>
            </a>
            <p className={styles.copy}>© {new Date().getFullYear()} Scopo. All rights reserved.</p>
          </div>
          <nav className={styles.links} aria-label="Quick links">
            <a href="#hero" className={styles.link}>Get started</a>
            <span className={styles.sep} aria-hidden="true">·</span>
            <a href="/lookup" className={styles.link}>Lookup</a>
            <span className={styles.sep} aria-hidden="true">·</span>
            <a href="/register" className={styles.link}>Register</a>
            <span className={styles.sep} aria-hidden="true">·</span>
            <a href="/login" className={styles.link}>Log in</a>
          </nav>
        </div>
      </Container>
    </footer>
  )
}
