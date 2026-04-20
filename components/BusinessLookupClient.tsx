'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

const PRIORITY_KEYS = [
  'industry',
  'location',
  'description',
  'foundedYear',
  'employeeCount',
  'fundingStage',
  'revenueSignal',
  'services',
  'contactInfo',
] as const

type DynamicFields = Record<string, unknown>

function SkeletonLine({
  width,
  height = 12,
  radius = 8,
}: {
  width: string | number
  height?: number
  radius?: number
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background:
          'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.06) 100%)',
        backgroundSize: '200% 100%',
        animation: 'lookup-skeleton-wave 1.15s ease-in-out infinite',
      }}
    />
  )
}

export type LookupProfile = {
  businessName: string
  fields: DynamicFields
  displayOrder: string[]
  citations: Array<{ label: string; url: string }>
  confidenceNotes: string[]
}

type LookupResult = {
  sourceUrl: string
  profile: LookupProfile
  rawResponse: unknown
}

export type SavedProfile = {
  id: string
  userEmail: string
  sourceUrl: string
  name: string
  industry: string | null
  location: string | null
  description: string | null
  services: string[] | null
  contactInfo: Record<string, unknown> | null
  dynamicProfile?: LookupProfile | null
  chatHistory?: Array<{ role: 'user' | 'assistant'; text: string; label?: string }>
  rawResponse: unknown
  createdAt: string
  updatedAt: string
}

function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase())
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasRenderableValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number' || typeof value === 'boolean') return true
  if (Array.isArray(value)) return value.some((item) => hasRenderableValue(item))
  if (isPlainObject(value)) return Object.values(value).some((item) => hasRenderableValue(item))
  return false
}

function orderedEntries(fields: DynamicFields, displayOrder: string[]): Array<[string, unknown]> {
  const explicit = displayOrder.filter((key) => key in fields)
  const byPriority = PRIORITY_KEYS.filter((key) => key in fields && !explicit.includes(key))
  const rest = Object.keys(fields).filter((key) => !explicit.includes(key) && !byPriority.includes(key as (typeof PRIORITY_KEYS)[number]))
  const order = [...explicit, ...byPriority, ...rest]
  return order
    .map((key) => [key, fields[key]] as [string, unknown])
    .filter(([, value]) => hasRenderableValue(value))
}

function renderValue(value: unknown): ReactNode {
  if (value === null || value === undefined) return 'Unknown'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
      return (
        <a href={value} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', wordBreak: 'break-all' }}>
          {value}
        </a>
      )
    }
    return String(value)
  }
  if (Array.isArray(value)) {
    if (!value.length) return 'Unknown'
    return value.map((item, idx) => (
      <span key={`${idx}-${String(item)}`} style={{ marginRight: 8 }}>
        {typeof item === 'string' ? item : JSON.stringify(item)}
      </span>
    ))
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value)
    if (!entries.length) return 'Unknown'
    return (
      <div style={{ marginTop: 4 }}>
        {entries.map(([k, v]) => (
          <div key={k} style={{ marginTop: 2 }}>
            <strong style={{ color: 'var(--text)' }}>{humanizeKey(k)}:</strong> {renderValue(v)}
          </div>
        ))}
      </div>
    )
  }
  return String(value)
}

type Props = {
  initialUrl?: string
  onProfileSaved?: (profile: SavedProfile) => void
  selectedProfile?: SavedProfile | null
  onProfilePatched?: (profile: SavedProfile) => void
}

export default function BusinessLookupClient({
  initialUrl = '',
  onProfileSaved,
  selectedProfile,
  onProfilePatched,
}: Props) {
  const [url, setUrl] = useState(initialUrl)
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<LookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [inputFocused, setInputFocused] = useState(false)
  const [chat, setChat] = useState<Array<{ role: 'user' | 'assistant'; text: string; label?: string }>>([])
  const [pendingDetails, setPendingDetails] = useState<Record<string, unknown> | null>(null)
  const [savingDetails, setSavingDetails] = useState(false)
  const chatMode = Boolean(selectedProfile)

  useEffect(() => {
    if (chatMode && selectedProfile) {
      setChat(Array.isArray(selectedProfile.chatHistory) ? selectedProfile.chatHistory : [])
      setQuestion('')
      setPendingDetails(null)
      return
    }
    setChat([])
    setQuestion('')
    setPendingDetails(null)
  }, [chatMode, selectedProfile?.id])

  async function parseResponseBody(response: Response): Promise<{ error?: string; [key: string]: unknown }> {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try {
        return (await response.json()) as { error?: string; [key: string]: unknown }
      } catch {
        return {}
      }
    }

    const text = await response.text()
    return text ? { error: text } : {}
  }

  async function runLookup() {
    if (chatMode && selectedProfile) {
      await askFollowUp()
      return
    }

    setLoading(true)
    setError(null)
    setSaveMessage(null)
    setResult(null)

    try {
      const response = await fetch('/api/business-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const payload = (await parseResponseBody(response)) as LookupResult & { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'Lookup failed.')
      }

      setResult({
        sourceUrl: payload.sourceUrl,
        profile: payload.profile,
        rawResponse: payload.rawResponse ?? null,
      })
    } catch (lookupError) {
      setResult(null)
      setError(lookupError instanceof Error ? lookupError.message : 'Lookup failed.')
    } finally {
      setLoading(false)
    }
  }

  async function askFollowUp() {
    if (!selectedProfile || !question.trim()) return
    setLoading(true)
    setError(null)
    setSaveMessage(null)

    try {
      const userMessage = { role: 'user' as const, text: question.trim() }
      const chatAfterUser = [...chat, userMessage]
      setChat(chatAfterUser)
      const response = await fetch('/api/business-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: selectedProfile,
          question: question.trim(),
        }),
      })
      const payload = (await parseResponseBody(response)) as { error?: string; answer?: string; details?: Record<string, unknown> }
      if (!response.ok) {
        throw new Error(payload.error || 'Chat request failed.')
      }

      const answer = typeof payload.answer === 'string' ? payload.answer : 'No answer returned.'
      const assistantMessage = {
        role: 'assistant' as const,
        text: answer.replace(/^answer\s*:\s*/i, '').trim(),
        label: questionToLabel(question),
      }
      const nextHistory = [...chatAfterUser, assistantMessage]
      setChat(nextHistory)
      setPendingDetails(payload.details && Object.keys(payload.details).length ? payload.details : null)
      setQuestion('')
      await persistChatHistory(nextHistory)
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : 'Chat request failed.')
    } finally {
      setLoading(false)
    }
  }

  async function persistChatHistory(history: Array<{ role: 'user' | 'assistant'; text: string; label?: string }>) {
    if (!selectedProfile) return
    const response = await fetch('/api/business-profiles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: selectedProfile.id,
        chatHistory: history,
      }),
    })
    const payload = (await parseResponseBody(response)) as { error?: string; profile?: SavedProfile }
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to persist chat history.')
    }
    if (payload.profile && onProfilePatched) {
      onProfilePatched(payload.profile)
    }
  }

  function questionToLabel(q: string): string {
    const lower = q.toLowerCase()
    if (lower.includes('support') || lower.includes('email')) return 'Support'
    if (lower.includes('competitor')) return 'Competitors'
    if (lower.includes('pricing') || lower.includes('price')) return 'Pricing'
    if (lower.includes('revenue')) return 'Revenue'
    if (lower.includes('lead')) return 'Leadership'
    return 'Insight'
  }

  async function saveProfile() {
    if (!result) return

    setSaving(true)
    setSaveMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/business-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: result.sourceUrl,
          profile: result.profile,
          rawResponse: result.rawResponse,
          lookupProfile: result.profile,
        }),
      })

      const payload = (await parseResponseBody(response)) as { error?: string; profile?: SavedProfile }
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save profile.')
      }

      setSaveMessage('Profile saved.')
      if (payload.profile && onProfileSaved) {
        onProfileSaved(payload.profile)
      }
      setUrl('')
      setResult(null)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  async function saveDetailsToProfile() {
    if (!selectedProfile || !pendingDetails) return
    setSavingDetails(true)
    setError(null)
    try {
      const response = await fetch('/api/business-profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: selectedProfile.id,
          details: pendingDetails,
        }),
      })
      const payload = (await parseResponseBody(response)) as { error?: string; profile?: SavedProfile }
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save details.')
      }
      if (payload.profile && onProfilePatched) {
        onProfilePatched(payload.profile)
      }
      setSaveMessage('Details saved to selected profile.')
      setPendingDetails(null)
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : 'Failed to save details.')
    } finally {
      setSavingDetails(false)
    }
  }

  return (
    <section style={{ marginTop: 16 }}>
      <style>{`
        @keyframes lookup-skeleton-wave {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <label htmlFor="business-url" style={{ display: 'block', marginBottom: 8, fontSize: 14, color: 'var(--text-muted)' }}>
        {chatMode ? `Ask about: ${selectedProfile?.name || 'Selected profile'}` : 'Business URL'}
      </label>
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          minWidth: 260,
          display: 'flex',
          alignItems: 'stretch',
          border: `1px solid ${inputFocused ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 10,
          overflow: 'hidden',
          background: 'var(--bg-2)',
          boxShadow: inputFocused ? '0 0 0 1px rgba(200, 240, 74, 0.2)' : 'none',
        }}
      >
        <input
          id="business-url"
          type={chatMode ? 'text' : 'url'}
          value={chatMode ? question : url}
          onChange={(event) => (chatMode ? setQuestion(event.target.value) : setUrl(event.target.value))}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void runLookup()
            }
          }}
          placeholder={chatMode ? 'Ask a follow-up question about this company...' : 'https://example.com'}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            color: 'var(--text)',
            fontSize: 14,
            padding: '10px 12px',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={runLookup}
          disabled={loading || !(chatMode ? question.trim() : url.trim())}
          style={{
            flexShrink: 0,
            padding: '0 20px',
            border: 'none',
            background: loading || !(chatMode ? question.trim() : url.trim()) ? 'var(--accent-dim)' : 'var(--accent)',
            color: '#0a0a08',
            fontWeight: 500,
            cursor: loading || !(chatMode ? question.trim() : url.trim()) ? 'not-allowed' : 'pointer',
            fontSize: 13,
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Loading' : chatMode ? 'Ask' : 'Lookup'}
        </button>
      </div>

      {error ? (
        <p style={{ marginTop: 12, color: '#ff8f8f', fontSize: 14 }}>{error}</p>
      ) : null}

      {saveMessage ? (
        <p style={{ marginTop: 12, color: 'var(--accent)', fontSize: 14 }}>{saveMessage}</p>
      ) : null}

      {chatMode ? (
        <div style={{ marginTop: 12 }}>
          {loading ? (
            <div
              style={{
                marginTop: 8,
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--bg-2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              aria-live="polite"
            >
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Thinking</span>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-dim)', animation: 'pulse-dot 1s ease-in-out infinite' }} />
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--text-dim)',
                  animation: 'pulse-dot 1s ease-in-out infinite',
                  animationDelay: '0.15s',
                }}
              />
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--text-dim)',
                  animation: 'pulse-dot 1s ease-in-out infinite',
                  animationDelay: '0.3s',
                }}
              />
            </div>
          ) : null}

          {chat.map((item, idx) => (
            <div
              key={`${item.role}-${idx}`}
              style={{
                marginTop: 8,
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: item.role === 'assistant' ? 'var(--bg-2)' : 'var(--bg-3)',
                fontSize: 13,
                color: 'var(--text-muted)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: 'var(--text)' }}>
                {item.role === 'assistant' ? item.label || 'Insight' : 'You'}:
              </strong>{' '}
              {item.text}
            </div>
          ))}

          {pendingDetails ? (
            <button
              type="button"
              onClick={saveDetailsToProfile}
              disabled={savingDetails}
              style={{
                marginTop: 10,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--accent)',
                background: savingDetails ? 'var(--accent-dim)' : 'var(--accent)',
                color: '#fff',
                fontWeight: 600,
              }}
            >
              {savingDetails ? 'Saving details...' : 'Save details to this profile'}
            </button>
          ) : null}
        </div>
      ) : null}

      {!chatMode && result ? (
        <article
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--bg-2)',
          }}
        >
          <p style={{ fontSize: 13, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
            Source: <span style={{ color: 'var(--text)' }}>{result.sourceUrl}</span>
          </p>

          <h2 style={{ marginTop: 10, fontSize: 24, fontWeight: 500 }}>{result.profile.businessName}</h2>
          <div style={{ marginTop: 10, fontSize: 14, color: 'var(--text-muted)' }}>
            {orderedEntries(result.profile.fields, result.profile.displayOrder).map(([key, value]) => (
              <div key={key} style={{ marginTop: 6 }}>
                <strong style={{ color: 'var(--text)' }}>{humanizeKey(key)}:</strong> {renderValue(value)}
              </div>
            ))}
          </div>

          {result.profile.citations.length ? (
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text)' }}>Sources:</strong>{' '}
              {result.profile.citations.map((citation) => (
                <a
                  key={`${citation.label}-${citation.url}`}
                  href={citation.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--accent)', marginRight: 8 }}
                >
                  {citation.label}
                </a>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            style={{
              marginTop: 16,
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </article>
      ) : null}

      {!chatMode && loading ? (
        <article
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--bg-2)',
          }}
          aria-busy="true"
          aria-live="polite"
        >
          <SkeletonLine width="56%" height={12} />
          <div style={{ height: 10 }} />
          <SkeletonLine width="40%" height={28} radius={10} />
          <div style={{ height: 12 }} />
          <SkeletonLine width="76%" />
          <div style={{ height: 8 }} />
          <SkeletonLine width="92%" />
          <div style={{ height: 8 }} />
          <SkeletonLine width="68%" />
          <div style={{ height: 12 }} />
          <SkeletonLine width="28%" />
          <div style={{ height: 14 }} />
          <SkeletonLine width={120} height={36} radius={10} />
        </article>
      ) : null}
    </section>
  )
}
