import { getAuthSession } from '@/lib/auth-session'
import { NextResponse } from 'next/server'

const DEFAULT_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash'

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

const BUSINESS_TOPIC_HINTS = [
  'company',
  'business',
  'industry',
  'market',
  'competitor',
  'pricing',
  'revenue',
  'funding',
  'employee',
  'headcount',
  'leadership',
  'ceo',
  'product',
  'service',
  'customer',
  'audience',
  'location',
  'hq',
  'tech',
  'stack',
  'contact',
  'support',
  'email',
  'phone',
  'address',
  'help',
  'customer service',
  'website',
  'risk',
  'news',
  'growth',
  'strategy',
  'partnership',
  'acquisition',
] as const

const OFF_TOPIC_HINTS = [
  'joke',
  'poem',
  'story',
  'recipe',
  'movie',
  'song',
  'relationship',
  'therapy',
  'horoscope',
  'religion',
  'politics',
  'homework',
  'math problem',
  'game tips',
] as const

function isQuestionBusinessRelated(question: string, profileName: string, sourceUrl: string): boolean {
  const q = question.toLowerCase()
  const hasBusinessHint = BUSINESS_TOPIC_HINTS.some((hint) => q.includes(hint))
  const hasOffTopicHint = OFF_TOPIC_HINTS.some((hint) => q.includes(hint))
  const hasProfileName = profileName && q.includes(profileName.toLowerCase())
  const host = (() => {
    try {
      return new URL(sourceUrl).hostname.replace(/^www\./i, '').toLowerCase()
    } catch {
      return ''
    }
  })()
  const hasHostReference = host ? q.includes(host) : false

  // Be permissive: only block when it is clearly unrelated.
  if (hasOffTopicHint && !hasBusinessHint && !hasProfileName && !hasHostReference) return false
  // Accept if it references the selected company (name/domain), even without explicit business keywords.
  if (hasProfileName || hasHostReference) return true
  return hasBusinessHint
}

function parseDetails(raw: string): Record<string, string | string[]> {
  const details: Record<string, string | string[]> = {}
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  function normalizeDetailKey(input: string): string | null {
    const cleaned = input.replace(/[^A-Za-z0-9 ]+/g, ' ').trim()
    if (!cleaned) return null
    const words = cleaned.split(/\s+/).filter(Boolean)
    // Keep compact field-like keys and reject sentence-like labels.
    if (words.length > 4 || cleaned.length > 30) return null
    const first = words[0]?.toLowerCase() || ''
    if (first === 'the' || first === 'this') return null
    const lowered = words.map((w) => w.toLowerCase())
    return lowered
      .map((w, idx) => (idx === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join('')
  }

  for (const line of lines) {
    const cleaned = line.replace(/^[*\-•]\s*/, '')
    const match = cleaned.match(/^([A-Za-z0-9_ ]+):\s*(.+)$/)
    if (!match) continue
    const key = normalizeDetailKey(match[1] || '')
    const value = match[2]?.trim()
    if (!key || !value) continue

    const arr = value.match(/^\[(.*)\]$/)
    if (arr) {
      const items = arr[1]
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      if (items.length) details[key] = items
      continue
    }
    details[key] = value
  }

  return details
}

function extractAnswerAndDetails(raw: string): { answer: string; details: Record<string, string | string[]> } {
  const normalized = raw.replace(/\r/g, '')
  const lines = normalized
    .split('\n')
    .map((line) => line.trim().replace(/^[*\-•]\s*/, ''))
    .filter(Boolean)

  const metaLine = /^(company|question|known profile fields|return plain text|only include|strict policy|you are helping)/i
  const cleaned = lines.filter((line) => !metaLine.test(line))

  const answerLines = cleaned.filter((line) => /^answer\s*:/i.test(line))
  const answer = answerLines.length
    ? answerLines[answerLines.length - 1]!.replace(/^answer\s*:\s*/i, '').trim()
    : (cleaned[0] || 'No answer available.')

  const detailsStartIdx = cleaned.findIndex((line) => /^details\s*:/i.test(line))
  const detailsBlock =
    detailsStartIdx >= 0
      ? cleaned
          .slice(detailsStartIdx + 1)
          .join('\n')
          .trim()
      : ''

  const details = detailsBlock ? parseDetails(detailsBlock) : {}
  return { answer, details }
}

function primaryKeyFromQuestion(question: string): string {
  const q = question.toLowerCase()
  if (q.includes('employee') || q.includes('headcount') || q.includes('team size')) return 'employeeCount'
  if (q.includes('revenue')) return 'revenueSignals'
  if (q.includes('pricing') || q.includes('price')) return 'pricingModel'
  if (q.includes('competitor')) return 'competitors'
  if (q.includes('support') || q.includes('email') || q.includes('contact')) return 'supportContact'
  if (q.includes('leader') || q.includes('ceo') || q.includes('founder')) return 'leadership'
  return 'insight'
}

function canonicalizeDetailKey(key: string): string {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (normalized.includes('employeecount')) return 'employeeCount'
  if (normalized.includes('employee') && normalized.includes('asof')) return 'employeeCountAsOf'
  if (normalized.includes('employeesource') || normalized.includes('countsource')) return 'employeeCountSource'
  if (normalized.includes('revenue')) return 'revenueSignals'
  if (normalized.includes('pricing')) return 'pricingModel'
  if (normalized.includes('competitor')) return 'competitors'
  if (normalized.includes('support') || normalized.includes('contact') || normalized.includes('email')) return 'supportContact'
  if (normalized.includes('leader') || normalized.includes('ceo') || normalized.includes('founder')) return 'leadership'
  return key
}

function valueToString(value: string | string[]): string {
  return Array.isArray(value) ? value.join(', ') : value
}

function condenseDetails(
  question: string,
  answer: string,
  details: Record<string, string | string[]>,
): Record<string, string | string[]> {
  const primaryKey = primaryKeyFromQuestion(question)
  const ignoreKeys = new Set(['fieldname', 'searchquery', 'searchQuery', 'answer', 'details'])

  const mapped: Record<string, string | string[]> = {}
  for (const [rawKey, rawValue] of Object.entries(details)) {
    if (ignoreKeys.has(rawKey)) continue
    const key = canonicalizeDetailKey(rawKey)
    const val = valueToString(rawValue).trim()
    if (!val) continue
    mapped[key] = val
  }

  const primaryValue =
    (mapped[primaryKey] && valueToString(mapped[primaryKey]).trim().length > 0
      ? mapped[primaryKey]
      : answer) || answer

  // Strict mode: save only one canonical field by default.
  const compact: Record<string, string | string[]> = {
    [primaryKey]: primaryValue,
  }

  return compact
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

  let body: { profile?: unknown; question?: unknown }
  try {
    body = (await req.json()) as { profile?: unknown; question?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const question = asText(body.question)
  if (!question) {
    return NextResponse.json({ error: 'question is required.' }, { status: 400 })
  }

  const profile = body.profile && typeof body.profile === 'object' ? (body.profile as Record<string, unknown>) : {}
  const profileName = asText(profile.name) || asText(profile.businessName) || 'Selected company'
  const sourceUrl = asText(profile.sourceUrl)
  if (!isQuestionBusinessRelated(question, profileName, sourceUrl)) {
    return NextResponse.json(
      {
        error:
          'This chat only supports company-related intelligence questions for the selected profile. Ask about business details like industry, products, competitors, pricing, team, revenue signals, risks, or market position.',
      },
      { status: 400 },
    )
  }

  const knownFields =
    profile.dynamicProfile && typeof profile.dynamicProfile === 'object'
      ? JSON.stringify((profile.dynamicProfile as Record<string, unknown>).fields ?? {}, null, 2)
      : JSON.stringify((profile.rawResponse as Record<string, unknown>)?.fields ?? {}, null, 2)

  const prompt = [
    'You are helping with follow-up business intelligence Q&A for one selected company only.',
    'Strict policy: refuse unrelated requests. Do not entertain general chat or non-business topics.',
    `Company: ${profileName}`,
    sourceUrl ? `Source URL: ${sourceUrl}` : '',
    'Known profile fields:',
    knownFields,
    `Question: ${question}`,
    'Important: do fresh web-grounded lookup for the question; do not rely only on known profile fields.',
    'If the user asks for a metric that may not be officially disclosed (for example employee count), provide the best public estimate or range and label it as estimate.',
    'Prefer answer + source-backed estimate over saying "not available" when credible public estimates exist.',
    'Return plain text in this format (no markdown, no bullets):',
    'Answer: <direct response>',
    'Details:',
    'FieldName: value',
    'AnotherField: [item1, item2]',
    'Include source-backed fields when useful, e.g. EmployeeCountEstimate: value, EmployeeCountEstimateSource: url.',
    'Only include new/updated useful details inferred from the question.',
    'Do not repeat these instructions. Do not include "Company:" or "Question:" in your output.',
  ]
    .filter(Boolean)
    .join('\n')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60000)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(DEFAULT_MODEL)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
        }),
      },
    )

    if (!response.ok) {
      const errText = await response.text()
      return NextResponse.json({ error: `Gemini request failed (${response.status}): ${errText}` }, { status: 500 })
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const raw =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('\n').trim() ?? ''

    const { answer, details } = extractAnswerAndDetails(raw)
    const cleanedAnswer = answer.replace(/^answer\s*:\s*/i, '').trim()
    const compactDetails = condenseDetails(question, cleanedAnswer, details)

    return NextResponse.json({ answer: cleanedAnswer, details: compactDetails, raw })
  } finally {
    clearTimeout(timer)
  }
}
