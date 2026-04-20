'use client'

import BusinessLookupClient, { type SavedProfile } from '@/components/BusinessLookupClient'
import { useMemo, useState } from 'react'
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

type Props = {
  initialUrl?: string
  initialProfiles: SavedProfile[]
}

function compactLabel(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function faviconUrlForSource(sourceUrl: string): string {
  try {
    const host = new URL(sourceUrl).hostname
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`
  } catch {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(sourceUrl)}&sz=64`
  }
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

function orderedEntries(fields: Record<string, unknown>, displayOrder: string[]): Array<[string, unknown]> {
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
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) {
      return (
        <a href={value} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', wordBreak: 'break-all' }}>
          {value}
        </a>
      )
    }
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    if (!value.length) return 'Unknown'
    return value.map((item, idx) => (
      <span key={`${idx}-${String(item)}`} style={{ marginRight: 8 }}>
        {typeof item === 'string' && /^https?:\/\//i.test(item) ? (
          <a href={item} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
            {compactLabel(item)}
          </a>
        ) : (
          typeof item === 'string' ? item : JSON.stringify(item)
        )}
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

function dynamicFromSaved(profile: SavedProfile): { fields: Record<string, unknown>; displayOrder: string[] } {
  if (profile.dynamicProfile && isPlainObject(profile.dynamicProfile.fields)) {
    return {
      fields: profile.dynamicProfile.fields as Record<string, unknown>,
      displayOrder: Array.isArray(profile.dynamicProfile.displayOrder) ? profile.dynamicProfile.displayOrder : [],
    }
  }

  if (isPlainObject(profile.rawResponse)) {
    const fields = isPlainObject(profile.rawResponse.fields)
      ? (profile.rawResponse.fields as Record<string, unknown>)
      : null
    if (fields) {
      return {
        fields,
        displayOrder: Array.isArray(profile.rawResponse.displayOrder)
          ? (profile.rawResponse.displayOrder as string[]).filter((item) => typeof item === 'string')
          : [],
      }
    }
  }

  // Backward-compat for previously saved fixed shape
  const legacyFields: Record<string, unknown> = {}
  if (profile.industry) legacyFields.industry = profile.industry
  if (profile.location) legacyFields.location = profile.location
  if (profile.description) legacyFields.description = profile.description
  if (Array.isArray(profile.services) && profile.services.length) legacyFields.services = profile.services
  if (profile.contactInfo && Object.keys(profile.contactInfo).length) legacyFields.contactInfo = profile.contactInfo

  if (isPlainObject(profile.rawResponse)) {
    const keys = [
      'category',
      'foundedYear',
      'employeeCount',
      'fundingStage',
      'revenueSignal',
      'products',
      'targetCustomers',
      'leadership',
      'techStack',
      'keySignals',
    ]
    for (const key of keys) {
      if (profile.rawResponse[key] !== undefined && profile.rawResponse[key] !== null) {
        legacyFields[key] = profile.rawResponse[key]
      }
    }
  }

  return { fields: legacyFields, displayOrder: [] }
}

function getFieldByAlias(fields: Record<string, unknown>, aliases: string[]): unknown {
  for (const alias of aliases) {
    if (alias in fields) return fields[alias]
  }
  const normalized = new Map(
    Object.entries(fields).map(([k, v]) => [k.toLowerCase().replace(/[^a-z0-9]/g, ''), v]),
  )
  for (const alias of aliases) {
    const v = normalized.get(alias.toLowerCase().replace(/[^a-z0-9]/g, ''))
    if (v !== undefined) return v
  }
  return undefined
}

function normalizeSavedProfile(profile: SavedProfile): SavedProfile {
  const raw = profile.rawResponse
  const rawObj =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null
  const dynamicProfile =
    rawObj
      ? {
          businessName: typeof rawObj.businessName === 'string' ? rawObj.businessName : profile.name,
          fields:
            rawObj.fields && typeof rawObj.fields === 'object' && !Array.isArray(rawObj.fields)
              ? (rawObj.fields as Record<string, unknown>)
              : {},
          displayOrder: Array.isArray(rawObj.displayOrder)
            ? (rawObj.displayOrder as unknown[]).filter((x): x is string => typeof x === 'string')
            : [],
          citations: Array.isArray(rawObj.citations)
            ? (rawObj.citations as Array<{ label: string; url: string }>)
            : [],
          confidenceNotes: Array.isArray(rawObj.confidenceNotes)
            ? (rawObj.confidenceNotes as unknown[]).filter((x): x is string => typeof x === 'string')
            : [],
        }
      : null
  const chatHistory =
    rawObj && Array.isArray(rawObj.chatHistory)
      ? rawObj.chatHistory
          .map((entry) =>
            entry && typeof entry === 'object' && !Array.isArray(entry)
              ? {
                  role:
                    (entry as Record<string, unknown>).role === 'user' ? 'user' : 'assistant',
                  text:
                    typeof (entry as Record<string, unknown>).text === 'string'
                      ? ((entry as Record<string, unknown>).text as string)
                      : '',
                  label:
                    typeof (entry as Record<string, unknown>).label === 'string'
                      ? ((entry as Record<string, unknown>).label as string)
                      : undefined,
                }
              : null,
          )
          .filter((entry) => Boolean(entry && entry.text))
          .map((entry) => entry as { role: 'user' | 'assistant'; text: string; label?: string })
      : []

  return {
    ...profile,
    dynamicProfile,
    chatHistory,
  }
}

export default function DashboardWorkspace({ initialUrl = '', initialProfiles }: Props) {
  const [profiles, setProfiles] = useState<SavedProfile[]>(initialProfiles.map(normalizeSavedProfile))
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null)
  const [deletingFieldKey, setDeletingFieldKey] = useState<string | null>(null)

  const sortedProfiles = useMemo(
    () => {
      const sorted = [...profiles].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      if (!expandedId) return sorted
      const selected = sorted.find((p) => p.id === expandedId)
      if (!selected) return sorted
      return [selected, ...sorted.filter((p) => p.id !== expandedId)]
    },
    [profiles, expandedId],
  )

  function handleProfileSaved(profile: SavedProfile) {
    setProfiles((current) => {
      const normalized = normalizeSavedProfile(profile)
      const withoutDuplicate = current.filter((item) => item.id !== profile.id)
      return [normalized, ...withoutDuplicate]
    })
    setExpandedId(profile.id)
  }

  function handleProfilePatched(profile: SavedProfile) {
    const normalized = normalizeSavedProfile(profile)
    setProfiles((current) => current.map((item) => (item.id === normalized.id ? normalized : item)))
  }

  async function handleDeleteProfile(profileId: string) {
    if (!confirm('Delete this profile and its chat history?')) return
    setDeletingProfileId(profileId)
    try {
      const response = await fetch('/api/business-profiles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })
      if (!response.ok) {
        throw new Error('Failed to delete profile.')
      }
      setProfiles((current) => current.filter((p) => p.id !== profileId))
      setExpandedId((current) => (current === profileId ? null : current))
    } catch {
      // no-op; keep UI stable
    } finally {
      setDeletingProfileId(null)
    }
  }

  async function handleDeleteField(profileId: string, fieldKey: string) {
    setDeletingFieldKey(`${profileId}:${fieldKey}`)
    try {
      const response = await fetch('/api/business-profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, removeFieldKey: fieldKey }),
      })
      const payload = (await response.json()) as { profile?: SavedProfile }
      if (!response.ok || !payload.profile) {
        throw new Error('Failed to delete field.')
      }
      handleProfilePatched(payload.profile)
    } catch {
      // no-op; keep UI stable
    } finally {
      setDeletingFieldKey(null)
    }
  }

  const selectedProfile = expandedId ? profiles.find((profile) => profile.id === expandedId) || null : null

  return (
    <section
      style={{
        marginTop: 20,
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: '1 1 460px', minWidth: 320 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Business Lookup</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {selectedProfile
            ? `Ask follow-up questions about ${selectedProfile.name}.`
            : 'Enter a business website, generate a profile, then save it.'}
        </p>
        <BusinessLookupClient
          initialUrl={initialUrl}
          onProfileSaved={handleProfileSaved}
          selectedProfile={selectedProfile}
          onProfilePatched={handleProfilePatched}
        />
      </div>

      <div style={{ flex: '1 1 420px', minWidth: 320 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Saved Profiles</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Click a profile to toggle full details.</p>

        <section style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {sortedProfiles.length === 0 ? (
            <article
              style={{
                padding: 14,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--bg-2)',
                color: 'var(--text-muted)',
                fontSize: 14,
              }}
            >
              No saved profiles yet. Run a lookup and click Save profile.
            </article>
          ) : (
            sortedProfiles.map((profile) => {
              const isOpen = expandedId === profile.id
              const dynamic = dynamicFromSaved(profile)
              const industryValue = getFieldByAlias(dynamic.fields, ['industry'])
              const locationValue = getFieldByAlias(dynamic.fields, ['location', 'hqLocation', 'headquarters'])
              const summaryIndustry = typeof industryValue === 'string' ? industryValue : profile.industry
              const summaryLocation = typeof locationValue === 'string' ? locationValue : profile.location
              return (
                <article
                  key={profile.id}
                  style={{
                    borderRadius: 10,
                    border: isOpen ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: 'var(--bg-2)',
                    boxShadow: isOpen ? '0 0 0 1px rgba(200, 240, 74, 0.2)' : 'none',
                    transition: 'border-color 180ms ease, box-shadow 180ms ease',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, padding: 14 }}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : profile.id)}
                      style={{
                        flex: 1,
                        textAlign: 'left',
                        border: 'none',
                        background: 'transparent',
                        color: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img
                          src={faviconUrlForSource(profile.sourceUrl)}
                          alt=""
                          width={16}
                          height={16}
                          style={{ borderRadius: 2, flexShrink: 0 }}
                          aria-hidden="true"
                        />
                        <h3 style={{ fontSize: 16, fontWeight: 500 }}>{profile.name}</h3>
                      </div>
                      <p style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 13 }}>
                        {summaryIndustry || 'Unknown industry'} · {summaryLocation || 'Unknown location'}
                      </p>
                      <p style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 12 }}>
                        {isOpen ? 'Hide details' : 'Show details'}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteProfile(profile.id)}
                      disabled={deletingProfileId === profile.id}
                      style={{
                        height: 24,
                        width: 24,
                        padding: 0,
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text-dim)',
                        cursor: deletingProfileId === profile.id ? 'not-allowed' : 'pointer',
                        alignSelf: 'flex-start',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      aria-label="Delete profile"
                    >
                      {deletingProfileId === profile.id ? (
                        '...'
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M3 6h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          <path d="M8 6V4h8v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          <path d="M6 6l1 14h10l1-14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateRows: isOpen ? '1fr' : '0fr',
                      transition: 'grid-template-rows 220ms ease',
                    }}
                  >
                    <div
                      style={{
                        overflow: 'hidden',
                        opacity: isOpen ? 1 : 0,
                        transition: 'opacity 160ms ease',
                      }}
                    >
                      <div style={{ padding: '0 14px 14px 14px', borderTop: '1px solid var(--border)' }}>
                        <p style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: 13, wordBreak: 'break-all' }}>
                          <strong style={{ color: 'var(--text)' }}>Source:</strong> {profile.sourceUrl}
                        </p>
                        {orderedEntries(dynamic.fields, dynamic.displayOrder).map(([key, value]) => (
                          <div
                            key={key}
                            style={{
                              marginTop: 6,
                              color: 'var(--text-muted)',
                              fontSize: 13,
                              display: 'grid',
                              gridTemplateColumns: 'minmax(0,1fr) 22px',
                              columnGap: 8,
                              alignItems: 'start',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ color: 'var(--text)' }}>{humanizeKey(key)}:</strong> {renderValue(value)}
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleDeleteField(profile.id, key)}
                              disabled={deletingFieldKey === `${profile.id}:${key}`}
                              style={{
                                width: 20,
                                height: 20,
                                padding: 0,
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                color: 'var(--text-dim)',
                                borderRadius: 6,
                                cursor: deletingFieldKey === `${profile.id}:${key}` ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: 1,
                              }}
                              aria-label={`Delete ${humanizeKey(key)} field`}
                            >
                              {deletingFieldKey === `${profile.id}:${key}` ? (
                                '...'
                              ) : (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path d="M3 6h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                  <path d="M8 6V4h8v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                  <path d="M6 6l1 14h10l1-14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </section>
      </div>
    </section>
  )
}
