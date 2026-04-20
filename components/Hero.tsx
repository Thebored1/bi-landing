import Container from './Container'
import HeroDemoLive from './HeroDemoLive'
import styles from './Hero.module.css'
import HeroSymbolMatrix from './HeroSymbolMatrix'

export default function Hero() {
  return (
    <section id="hero" className={styles.hero}>
      <div className={styles.backdrop} aria-hidden="true">
        <div className={styles.backdropGlow} />
        <div className={styles.backdropGrid} />
        <HeroSymbolMatrix className={styles.symbolMatrix} />
      </div>
      <Container>
        <div className={styles.inner}>
          <div className={styles.badge}>
            <span className={styles.dot} />
            Business intelligence, instantly
          </div>

          <h1 className={styles.headline}>
            Every URL tells<br />
            <em>a story.</em>
          </h1>

          <p className={styles.description}>
            Paste any company URL and get a complete intelligence profile — industry, funding,
            team size, signals, and more. No research required.
          </p>

          <div className={styles.cta}>
            <a href="/register" className={styles.primaryBtn}>
              Get started free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>

          <HeroDemoLive />
        </div>
      </Container>
    </section>
  )
}
