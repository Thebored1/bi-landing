import Container from './Container'
import styles from './CTA.module.css'

export default function CTA() {
  return (
    <section className={styles.section}>
      <div className={styles.glow} aria-hidden="true" />
      <Container>
        <div className={styles.inner}>
          <p className={styles.eyebrow}>Start for free</p>
          <h2 className={styles.title}>
            The URL you need<br />
            is already waiting.
          </h2>
          <p className={styles.body}>
            No credit card. No setup. Just paste a URL and see what Scopo knows.
          </p>
          <div className={styles.actions}>
            <a href="/register" className={styles.primaryBtn}>
              Create free account
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="/login" className={styles.secondaryBtn}>Log in instead</a>
          </div>
          <p className={styles.footnote}>100 free lookups per month &nbsp;·&nbsp; No card required</p>
        </div>
      </Container>
    </section>
  )
}
