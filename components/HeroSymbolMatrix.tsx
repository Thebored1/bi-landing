'use client'

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

const POOL_CLOSE = ['!', '?', '*', '&', '%', '^', '$']
const POOL_MID = ['@', '=', '+', '/', '~', '>', '<', '^']
const POOL_FAR = [':', ';', '|', '`', '%', '?', '&']

/** Perf: fewer cells (wider spacing); glyph size fixed below so `#` stay visually the same. */
const MAX_CELLS = 9600
/** Fixed canvas font size (px) — not tied to `cell` so larger spacing does not scale glyphs up. */
const GLYPH_FONT_PX = 6

function pick(seed: number, pool: string[]) {
  return pool[Math.abs(seed) % pool.length] ?? '#'
}

/**
 * Cell size drives how many cols/rows fit. If `h` follows hero content height, longer/shorter
 * demo blurbs change `h` every loop tick → cell size jumps → the glyph field looks like it
 * “moves”. Cap the height used for density at the viewport so only real resizes rescale the grid.
 */
function pickCellSize(w: number, h: number) {
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900
  const hForDensity = Math.min(Math.max(h, 1), vh)
  const area = w * hForDensity
  return Math.max(8, Math.ceil(Math.sqrt(area / MAX_CELLS)))
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0 || 1e-6)))
  return t * t * (3 - 2 * t)
}

/** Brighter toward the top, darker toward the bottom (on dark bg). */
function verticalAlpha(cy: number, h: number) {
  const v = Math.min(1, Math.max(0, cy / h))
  return 0.036 + (1 - v) * 0.12
}

/**
 * Massive radial hover: strength is a smooth gradient from the cursor (never a hard “hole”),
 * builds through a wide band, peaks, then fades — viewport-scaled via minDim.
 */
function radialHoverRing(cx: number, cy: number, mx: number, my: number, tSec: number, minDim: number): number {
  const d = Math.hypot(cx - mx, cy - my)
  const breathe = 6 * Math.sin(tSec * 0.3) + 4 * Math.cos(tSec * 0.22)

  const rPeak = minDim * 0.44 + breathe
  const rFadeStart = minDim * 0.5 + breathe * 0.4
  const rFadeEnd = minDim * 0.72 + breathe * 0.6

  const rise = 0.12 + 0.88 * smoothstep(0, rPeak * 0.95, d)
  const fall = 1 - smoothstep(rFadeStart, rFadeEnd, d)
  let ring = Math.max(0, rise * fall)

  /* Thin rim flare at the outer fade edge (reads as a soft bright lip before falloff). */
  const rimIn = rFadeEnd - minDim * 0.1
  const rimT =
    smoothstep(rimIn, rFadeEnd - minDim * 0.02, d) * (1 - smoothstep(rFadeEnd, rFadeEnd + minDim * 0.09, d))
  ring += 0.14 * rimT

  if (d > rFadeEnd) {
    ring += 0.07 * Math.exp(-(d - rFadeEnd) / (minDim * 0.1))
  }

  return Math.min(1, ring)
}

type Props = {
  className?: string
}

export default function HeroSymbolMatrix({ className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerRef = useRef({ mx: -1e6, my: -1e6, inside: false })
  const rafRef = useRef(0)
  const lastCanvasPx = useRef({ w: 0, h: 0, dpr: 0 })
  const loopRef = useRef(0)

  const draw = useCallback(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const rect = wrap.getBoundingClientRect()
    const w = Math.max(1, Math.floor(rect.width))
    const h = Math.max(1, Math.floor(rect.height))

    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2)
    const pw = Math.floor(w * dpr)
    const ph = Math.floor(h * dpr)
    const prev = lastCanvasPx.current
    if (prev.w !== pw || prev.h !== ph || prev.dpr !== dpr) {
      canvas.width = pw
      canvas.height = ph
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      lastCanvasPx.current = { w: pw, h: ph, dpr }
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const cell = pickCellSize(w, h)
    const cols = Math.ceil(w / cell)
    const rows = Math.ceil(h / cell)

    const { mx, my, inside } = pointerRef.current
    const tSec = (typeof performance !== 'undefined' ? performance.now() : 0) * 0.001
    const minDim = Math.min(w, h)
    const fontPx = GLYPH_FONT_PX

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `500 ${fontPx}px ui-monospace, "Cascadia Code", "SF Mono", Menlo, monospace`

    try {
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const cx = i * cell + cell * 0.5
          const cy = j * cell + cell * 0.5
          const seed = i * 7919 + j * 92821

          const vert = verticalAlpha(cy, h)
          let ring = 0
          let ch = '#'

          if (inside) {
            ring = radialHoverRing(cx, cy, mx, my, tSec, minDim)
            if (ring > 0.52) ch = pick(Math.floor(seed + ring * 700), POOL_CLOSE)
            else if (ring > 0.32) ch = pick(Math.floor(seed + ring * 320), POOL_MID)
            else if (ring > 0.14) ch = pick(seed, POOL_FAR)
            else ch = '#'
          }

          const ringBoost = inside ? ring * 0.48 : 0
          const morphTick = ch !== '#' ? 0.035 : 0
          const a = Math.min(0.34, Math.max(0.04, vert * (1 + ringBoost) + morphTick))
          ctx.fillStyle = `rgba(255, 255, 255, ${a})`

          ctx.fillText(ch, cx, cy)
        }
      }
    } catch {
      /* glyph / font edge case */
    }
  }, [])

  const scheduleDraw = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      draw()
    })
  }, [draw])

  useEffect(() => {
    let last = 0
    const loop = (t: number) => {
      loopRef.current = requestAnimationFrame(loop)
      if (t - last >= 40) {
        last = t
        scheduleDraw()
      }
    }
    loopRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(loopRef.current)
  }, [scheduleDraw])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    let roRaf = 0
    const onResizeObserved = () => {
      if (roRaf) cancelAnimationFrame(roRaf)
      roRaf = requestAnimationFrame(() => {
        roRaf = 0
        scheduleDraw()
      })
    }

    const onPointerMove = (e: PointerEvent) => {
      const wr = wrap.getBoundingClientRect()
      if (wr.width < 8 || wr.height < 8) return

      const pad = 6
      const inside =
        e.clientX >= wr.left - pad &&
        e.clientX <= wr.right + pad &&
        e.clientY >= wr.top - pad &&
        e.clientY <= wr.bottom + pad

      pointerRef.current = {
        mx: e.clientX - wr.left,
        my: e.clientY - wr.top,
        inside,
      }

      scheduleDraw()
    }

    let detachResize: () => void = () => {}
    try {
      const ro = new ResizeObserver(onResizeObserved)
      ro.observe(wrap)
      detachResize = () => ro.disconnect()
    } catch {
      const onWinResize = () => onResizeObserved()
      window.addEventListener('resize', onWinResize, { passive: true })
      detachResize = () => window.removeEventListener('resize', onWinResize)
    }

    document.addEventListener('pointermove', onPointerMove, { capture: true, passive: true })
    scheduleDraw()

    return () => {
      detachResize()
      document.removeEventListener('pointermove', onPointerMove, true)
      if (roRaf) cancelAnimationFrame(roRaf)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [scheduleDraw])

  useLayoutEffect(() => {
    scheduleDraw()
  }, [scheduleDraw])

  return (
    <div ref={wrapRef} className={className}>
      <canvas ref={canvasRef} aria-hidden />
    </div>
  )
}
