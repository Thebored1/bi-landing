'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  HERO_DEMOS,
  HERO_LOOP_MS,
  faviconUrlForHost,
  type HeroDemo,
} from '@/lib/hero-demos'
import styles from './Hero.module.css'

function normalizeLookupQuery(raw: string) {
  const t = raw.trim()
  if (!t) return ''
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t.replace(/^\/+/, '')}`
}

export default function HeroDemoLive() {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [inputValue, setInputValue] = useState(HERO_DEMOS[0]!.host)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const demo: HeroDemo = HERO_DEMOS[index] ?? HERO_DEMOS[0]!

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  useEffect(() => {
    if (paused) {
      clearTick()
      return
    }
    tickRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_DEMOS.length)
    }, HERO_LOOP_MS)
    return clearTick
  }, [paused, clearTick])

  useEffect(() => {
    if (!paused) {
      setInputValue(demo.host)
    }
  }, [demo.host, paused])

  const goLookup = useCallback(() => {
    const q = normalizeLookupQuery(inputValue)
    if (!q) return
    router.push(`/lookup?url=${encodeURIComponent(q)}`)
  }, [inputValue, router])

  const handlePauseAndFocus = useCallback(() => {
    setPaused(true)
    clearTick()
    setInputValue('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [clearTick])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      goLookup()
    }
  }

  const onChipClick = (host: string) => {
    const i = HERO_DEMOS.findIndex((d) => d.host === host)
    setPaused(true)
    clearTick()
    if (i >= 0) setIndex(i)
    setInputValue(host)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <>
      <div className={styles.demoCard} data-paused={paused ? 'true' : 'false'}>
        <div className={styles.demoBar}>
          <div className={styles.demoDots}>
            <span />
            <span />
            <span />
          </div>
          <div className={styles.demoUrl}>scopo.app/lookup</div>
        </div>

        <div className={styles.demoInputWrap}>
          <div
            className={styles.demoInput}
            role="button"
            tabIndex={0}
            onClick={handlePauseAndFocus}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handlePauseAndFocus()
              }
            }}
            aria-label="Site URL — click to enter a URL"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {paused ? (
              <input
                ref={inputRef}
                className={styles.demoInputField}
                type="text"
                inputMode="url"
                autoComplete="url"
                placeholder="company.com"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={onKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span key={index} className={styles.loopUrlRoll}>
                <span className={styles.demoInputText}>{demo.host}</span>
                <span className={styles.cursor} aria-hidden="true" />
              </span>
            )}
          </div>
          <button type="button" className={styles.demoSearchBtn} onClick={goLookup}>
            Search
          </button>
        </div>

        <div className={styles.demoResult} aria-live={paused ? 'polite' : 'off'}>
          {paused ? (
            <p className={styles.demoPausedHint}>Enter a URL and press Search to open the lookup.</p>
          ) : (
            <div key={index} className={styles.loopPanelRoll}>
              <div className={styles.demoCompany}>
                <img
                  src={faviconUrlForHost(demo.host)}
                  alt=""
                  width={40}
                  height={40}
                  className={styles.demoLogoImg}
                  aria-hidden="true"
                />
                <div className={styles.demoKnowledge}>
                  <div className={styles.demoKnowledgeMain}>
                    <p className={styles.demoEntityName}>{demo.legalName}</p>
                    <p className={styles.demoEntityCategory}>{demo.category}</p>
                    <p className={styles.demoEntityBody}>
                      {demo.description}{' '}
                      <a
                        href={demo.source.href}
                        className={styles.demoSourceLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {demo.source.label}
                      </a>
                    </p>
                  </div>
                  <div className={styles.demoVerified} title="Verified profile">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div className={styles.demoStats}>
                {demo.stats.map((s) => (
                  <div key={s.label} className={styles.demoStat}>
                    <span className={styles.demoStatVal}>{s.value}</span>
                    <span className={styles.demoStatLabel}>{s.label}</span>
                  </div>
                ))}
              </div>
              <div className={styles.demoTags}>
                {demo.tags.map((t) => (
                  <span key={t} className={styles.demoTag}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className={styles.scanLine} aria-hidden="true" />
      </div>

      <div className={styles.examples}>
        <span className={styles.examplesLabel}>Try with</span>
        {HERO_DEMOS.map((d) => (
          <button
            key={d.host}
            type="button"
            className={styles.exampleChip}
            onClick={() => onChipClick(d.host)}
          >
            {d.host}
          </button>
        ))}
      </div>
    </>
  )
}
