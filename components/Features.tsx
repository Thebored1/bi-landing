import type { CSSProperties } from 'react'
import Container from './Container'
import styles from './Features.module.css'

const PARTICLE_PCT: [number, number][] = [
  [12, 8], [22, 18], [35, 12], [48, 22], [58, 8], [72, 16], [88, 28],
  [8, 42], [28, 52], [42, 38], [55, 48], [68, 42], [82, 55], [92, 40],
  [14, 68], [32, 78], [50, 72], [65, 85], [78, 68], [18, 88], [45, 92],
  [60, 58], [38, 62], [85, 78], [52, 18], [70, 32],
]

export default function Features() {
  return (
    <section className={styles.section}>
      <Container>
        <div className={styles.ticker} aria-hidden="true">
          <div className={styles.tickerTrack}>
            {[...Array(2)].map((_, i) => (
              <span key={i} className={styles.tickerContent}>
                {['Funding stage','Employee count','Industry vertical','Hiring signals','Leadership team','Company news','Tech stack','Founded year','HQ location','Revenue signals'].map(t => (
                  <span key={t} className={styles.tickerItem}>
                    <span className={styles.tickerDot} />{t}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.header}>
          <p className={styles.eyebrow}>What you get</p>
          <h2 className={styles.title}>Intelligence that<br /><em>actually works</em></h2>
        </div>

        <div className={styles.bento}>
          <article className={`${styles.card} ${styles.vizProfile}`}>
            <div className={styles.cardTop}>
              <h3 className={styles.cardHeading}>One paste, full context</h3>
              <p className={styles.cardKicker}>Instant research</p>
            </div>
            <div className={styles.stackWindows} aria-hidden="true">
              <div className={styles.stackWin} data-layer="1">
                <span className={styles.stackLabel}>Original</span>
              </div>
              <div className={styles.stackWin} data-layer="2">
                <span className={styles.stackLabel}>Signals</span>
              </div>
              <div className={styles.stackWin} data-layer="3">
                <span className={styles.stackLabel}>Brief</span>
              </div>
            </div>
          </article>

          <article className={`${styles.card} ${styles.vizStream}`}>
            <div className={styles.cardTop}>
              <h3 className={styles.cardHeading}>Live signal stream</h3>
              <p className={styles.cardKicker}>Always current</p>
            </div>
            <div className={styles.streamStage} aria-hidden="true">
              <div className={styles.streamChrome}>
                <span className={styles.streamDot} /><span className={styles.streamDot} /><span className={styles.streamDot} />
                <div className={styles.streamUrlBar} />
              </div>
              <div className={styles.streamGrid}>
                <div className={styles.streamBar} style={{ '--n': 0 } as CSSProperties} />
                <div className={styles.streamBar} style={{ '--n': 1 } as CSSProperties} />
                <div className={styles.streamBar} style={{ '--n': 2 } as CSSProperties} />
                <div className={styles.streamBar} style={{ '--n': 3 } as CSSProperties} />
                <div className={styles.streamBar} style={{ '--n': 4 } as CSSProperties} />
              </div>
              <div className={styles.streamSweep} />
            </div>
          </article>

          <article className={`${styles.card} ${styles.vizGraph}`}>
            <div className={styles.cardTop}>
              <h3 className={styles.cardHeading}>Shared intelligence</h3>
              <p className={styles.cardKicker}>Built for teams</p>
            </div>
            <div className={styles.graphSvg} aria-hidden="true">
              <svg viewBox="0 0 200 120" className={styles.graphSvgInner}>
                <defs>
                  <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(200,240,74,0)" />
                    <stop offset="50%" stopColor="rgba(200,240,74,0.45)" />
                    <stop offset="100%" stopColor="rgba(200,240,74,0)" />
                  </linearGradient>
                </defs>
                <path className={styles.graphEdge} pathLength="100" d="M40 60 L100 28 L160 60" fill="none" />
                <path className={styles.graphEdge} pathLength="100" d="M40 60 L100 92 L160 60" fill="none" />
                <path className={styles.graphPulse} pathLength="100" d="M100 28 L100 92" fill="none" />
                <circle className={styles.graphNode} cx="40" cy="60" r="6" />
                <circle className={styles.graphNode} cx="100" cy="28" r="6" />
                <circle className={styles.graphNode} cx="160" cy="60" r="6" />
                <circle className={styles.graphNode} cx="100" cy="92" r="7" />
              </svg>
            </div>
          </article>

          <article className={`${styles.card} ${styles.textCard}`}>
            <p className={styles.textEyebrow}>Profile depth</p>
            <h3 className={styles.textTitle}>A full profile in seconds</h3>
            <p className={styles.textBody}>
              No tabs. No guesswork. Paste a URL and get industry, funding, headcount, and signals — all at once.
            </p>
          </article>

          <article className={`${styles.card} ${styles.textCard}`}>
            <p className={styles.textEyebrow}>Live context</p>
            <h3 className={styles.textTitle}>Know what&apos;s happening now</h3>
            <p className={styles.textBody}>
              Scopo surfaces real-time signals — hiring spikes, recent funding, executive changes — so you always have context.
            </p>
          </article>

          <article className={`${styles.card} ${styles.spotlight}`}>
            <div className={styles.particles} aria-hidden="true">
              {PARTICLE_PCT.map(([top, left], i) => (
                <span
                  key={i}
                  className={styles.particle}
                  style={{ top: `${top}%`, left: `${left}%`, animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
            <div className={styles.spotlightInner}>
              <p className={styles.spotlightLabel}>Scopo</p>
              <h3 className={styles.spotlightTitle}>Ship the story, not the spreadsheet.</h3>
              <p className={styles.spotlightBody}>
                Save profiles, annotate findings, and share links — everyone stays aligned.
              </p>
              <a href="#" className={styles.spotlightCta} aria-label="Get started">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M7 4l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </article>

          <article className={`${styles.card} ${styles.wideCard}`}>
            <div className={styles.wideStat}>
              <span className={styles.wideVal}>&lt;3s</span>
              <span className={styles.wideLbl}>Avg. lookup</span>
            </div>
            <div className={styles.wideStat}>
              <span className={styles.wideVal}>40+</span>
              <span className={styles.wideLbl}>Signal types</span>
            </div>
            <div className={styles.wideStat}>
              <span className={styles.wideVal}>∞</span>
              <span className={styles.wideLbl}>URLs decoded</span>
            </div>
          </article>
        </div>
      </Container>
    </section>
  )
}
