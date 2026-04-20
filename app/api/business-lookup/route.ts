import { getAuthSession } from '@/lib/auth-session'
import { NextResponse } from 'next/server'

const DEFAULT_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash'

type LookupResponse = {
  businessName: string
  fields: Record<string, unknown>
  displayOrder: string[]
  citations: Array<{ label: string; url: string }>
  confidenceNotes: string[]
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function normalizeCitations(value: unknown): Array<{ label: string; url: string }> {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'object' && item ? (item as Record<string, unknown>) : null))
    .filter(Boolean)
    .map((entry) => ({
      label: normalizeString(entry?.label) || 'Source',
      url: normalizeString(entry?.url) || '',
    }))
    .filter((item) => item.url.length > 0)
}

function normalizeValue(value: unknown, depth = 0): unknown {
  if (depth > 3) return null
  if (value === null || value === undefined) return null

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => normalizeValue(item, depth + 1))
      .filter((item) => item !== null)
    return normalized.length ? normalized : null
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => [k.trim(), normalizeValue(v, depth + 1)] as const)
      .filter(([k, v]) => k.length > 0 && v !== null)
    if (!entries.length) return null
    return Object.fromEntries(entries)
  }
  return null
}

function normalizeFieldKey(key: string): string {
  const cleaned = key
    .replace(/[`"'{}()[\]]/g, '')
    .replace(/[^A-Za-z0-9_\- ]+/g, ' ')
    .trim()
  if (!cleaned) return ''
  const parts = cleaned
    .replace(/[_\-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.toLowerCase())
  if (!parts.length) return ''
  return parts
    .map((part, idx) => (idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('')
}

function extractJsonObject(rawText: string): Record<string, unknown> | null {
  const trimmed = rawText.trim()
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    return JSON.parse(unfenced) as Record<string, unknown>
  } catch {
    const start = unfenced.indexOf('{')
    const end = unfenced.lastIndexOf('}')
    if (start < 0 || end <= start) return null
    const candidate = unfenced.slice(start, end + 1)
    const sanitized = candidate
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/,\s*([}\]])/g, '$1')
    try {
      return JSON.parse(sanitized) as Record<string, unknown>
    } catch {
      return null
    }
  }
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('`') && trimmed.endsWith('`'))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function parseLooseStructuredText(rawText: string): Record<string, unknown> | null {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  let businessName: string | null = null
  const fields: Record<string, unknown> = {}

  for (const line of lines) {
    const cleaned = line.replace(/^[*\-•]\s*/, '')
    const match = cleaned.match(/^`?([A-Za-z0-9_]+)`?\s*:\s*(.+)$/)
    if (!match) continue

    const key = match[1]?.trim() || ''
    const rawValue = stripWrappingQuotes(match[2] || '')
    if (!key || !rawValue) continue
    if (rawValue === '{' || rawValue === '}' || rawValue === '[]') continue

    const parsedArray = rawValue.match(/^\[(.*)\]$/)
    if (parsedArray) {
      const items = parsedArray[1]
        .split(',')
        .map((item) => stripWrappingQuotes(item))
        .filter(Boolean)
      if (items.length) {
        if (/^businessname$/i.test(key)) businessName = items[0] || businessName
        else fields[key] = items
        continue
      }
    }

    if (/^businessname$/i.test(key)) {
      businessName = rawValue
    } else if (/^(entity|name|companyname)$/i.test(key) && !businessName) {
      businessName = rawValue
    } else if (!/^(input|task|outputformat|goal|constraints|url|fields|field|json|format)$/i.test(key)) {
      fields[key] = rawValue
    }
  }

  if (!businessName && !Object.keys(fields).length) return null
  return {
    businessName: businessName || null,
    fields,
    displayOrder: [],
    citations: [],
    confidenceNotes: ['Recovered from non-JSON structured text response.'],
  }
}

function normalizeOutput(payload: Record<string, unknown>, sourceUrl: string): LookupResponse | null {
  const wrappedFields =
    payload.fields && typeof payload.fields === 'object'
      ? (payload.fields as Record<string, unknown>)
      : null

  const hostnameFallback = (() => {
    try {
      const host = new URL(sourceUrl).hostname.replace(/^www\./i, '')
      return host
        .split('.')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    } catch {
      return 'Unknown Company'
    }
  })()

  const businessName =
    normalizeString(payload.businessName) ||
    normalizeString(payload.companyName) ||
    normalizeString(payload.name) ||
    normalizeString(wrappedFields?.businessName) ||
    normalizeString(wrappedFields?.companyName) ||
    normalizeString(wrappedFields?.name) ||
    hostnameFallback

  const rawFields: Record<string, unknown> = wrappedFields ?? (() => {
    const skip = new Set(['businessName', 'companyName', 'name', 'displayOrder', 'citations', 'confidenceNotes'])
    const topLevel = Object.fromEntries(Object.entries(payload).filter(([key]) => !skip.has(key)))
    return topLevel
  })()

  const fields = Object.entries(rawFields)
    .map(([key, value]) => [normalizeFieldKey(key), normalizeValue(value)] as const)
    .filter(([key, value]) => key.length > 0 && value !== null)
  const normalizedFields = Object.fromEntries(fields)

  return {
    businessName,
    fields: normalizedFields,
    displayOrder: normalizeStringArray(payload.displayOrder),
    citations: normalizeCitations(payload.citations),
    confidenceNotes: normalizeStringArray(payload.confidenceNotes),
  }
}

function fallbackProfileFromText(sourceUrl: string, rawText: string): LookupResponse {
  const host = (() => {
    try {
      return new URL(sourceUrl).hostname.replace(/^www\./i, '')
    } catch {
      return 'Unknown Company'
    }
  })()
  const businessName = host
    .split('.')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

  return {
    businessName: businessName || 'Unknown Company',
    fields: {
      sourceUrl,
      extractedSummary: rawText.slice(0, 2500) || 'No structured summary returned by model.',
      parsingStatus: 'fallback_unstructured',
    },
    displayOrder: ['sourceUrl', 'parsingStatus', 'extractedSummary'],
    citations: [],
    confidenceNotes: ['Model output was unstructured; showing fallback extracted summary.'],
  }
}

async function callGemini(url: string, apiKey: string): Promise<{ normalized: LookupResponse | null; rawText: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60000)

  const prompt = [
    'Analyze the business website URL with web grounding and return plain structured text.',
    'Find as much useful company intelligence as possible. It is okay if some details are missing.',
    'Use this simple format:',
    'BusinessName: <value>',
    'Industry: <value>',
    'Location: <value>',
    'Description: <value>',
    'Services: [item1, item2]',
    '...and any other useful fields as `FieldName: value`.',
    'For nested details, flatten keys like `ContactEmail`, `ContactPhone`, `PricingModel`, `Competitors`.',
    'For lists, always use [a, b, c] format.',
    'For fields, prioritize useful business details such as: industry, location, description, services, products, target customers, leadership, tech stack, funding stage, employee count, revenue signals, contact info, notable news, risk signals, competitors, pricing model, and any other relevant attributes you can find.',
    'If you cannot find a value, omit that field instead of inventing it.',
    'Do not include JSON braces or markdown bullets.',
    `URL: ${url}`,
  ].join('\n')

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(DEFAULT_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          tools: [{ google_search: {} }],
        }),
      },
    )

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Gemini request failed (${response.status}): ${errText}`)
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>
        }
      }>
    }

    const rawText =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('\n')
        .trim() ?? ''

    const parsed = rawText ? extractJsonObject(rawText) || parseLooseStructuredText(rawText) : null
    return { normalized: parsed ? normalizeOutput(parsed, url) : null, rawText }
  } finally {
    clearTimeout(timer)
  }
}

export async function POST(req: Request) {
  const session = await getAuthSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim()
  if (!geminiApiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on server.' }, { status: 500 })
  }

  let body: { url?: string }
  try {
    body = (await req.json()) as { url?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const rawInput = typeof body.url === 'string' ? body.url.trim() : ''
  if (!rawInput) {
    return NextResponse.json({ error: 'URL is required.' }, { status: 400 })
  }

  const url = /^https?:\/\//i.test(rawInput) ? rawInput : `https://${rawInput.replace(/^\/+/, '')}`

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Please provide a valid URL (include protocol).' }, { status: 400 })
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'URL protocol must be http or https.' }, { status: 400 })
  }

  try {
    const { normalized, rawText } = await callGemini(parsedUrl.toString(), geminiApiKey)
    if (!normalized) {
      const fallback = fallbackProfileFromText(parsedUrl.toString(), rawText || '')
      return NextResponse.json({
        profile: fallback,
        sourceUrl: parsedUrl.toString(),
        model: DEFAULT_MODEL,
        rawResponse: rawText || null,
        warning: 'Model output was unstructured; fallback profile returned.',
      })
    }

    return NextResponse.json({
      profile: normalized,
      sourceUrl: parsedUrl.toString(),
      model: DEFAULT_MODEL,
      rawResponse: rawText || null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lookup failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
