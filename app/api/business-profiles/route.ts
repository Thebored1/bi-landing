import { getAuthSession } from '@/lib/auth-session'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

type RequestProfile = {
  businessName?: unknown
  fields?: unknown
  displayOrder?: unknown
  citations?: unknown
  confidenceNotes?: unknown
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function GET() {
  const session = await getAuthSession()
  const userEmail = session?.user?.email?.trim()
  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const profiles = await prisma.businessProfile.findMany({
      where: { userEmail },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ profiles })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load profiles.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getAuthSession()
  const userEmail = session?.user?.email?.trim()
  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: { sourceUrl?: unknown; profile?: RequestProfile; rawResponse?: unknown; lookupProfile?: unknown }
  try {
    payload = (await req.json()) as {
      sourceUrl?: unknown
      profile?: RequestProfile
      rawResponse?: unknown
      lookupProfile?: unknown
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const sourceUrl = asNullableString(payload.sourceUrl)
  if (!sourceUrl) {
    return NextResponse.json({ error: 'sourceUrl is required.' }, { status: 400 })
  }

  const profile = payload.profile ?? {}
  const businessName = asNullableString(profile.businessName)
  if (!businessName) {
    return NextResponse.json({ error: 'profile.businessName is required.' }, { status: 400 })
  }

  try {
    const fields =
      profile.fields && typeof profile.fields === 'object'
        ? (profile.fields as Record<string, unknown>)
        : {}

    const industry = asNullableString(fields.industry)
    const location = asNullableString(fields.location)
    const description = asNullableString(fields.description)
    const services = Array.isArray(fields.services)
      ? fields.services.filter((item): item is string => typeof item === 'string')
      : []
    const contactInfo =
      fields.contactInfo && typeof fields.contactInfo === 'object'
        ? (fields.contactInfo as Record<string, unknown>)
        : {}

    const dynamicPayload =
      payload.lookupProfile && typeof payload.lookupProfile === 'object'
        ? payload.lookupProfile
        : {
            businessName,
            fields,
            displayOrder: Array.isArray(profile.displayOrder) ? profile.displayOrder : [],
            citations: Array.isArray(profile.citations) ? profile.citations : [],
            confidenceNotes: Array.isArray(profile.confidenceNotes) ? profile.confidenceNotes : [],
          }

    const created = await prisma.businessProfile.create({
      data: {
        userEmail,
        sourceUrl,
        name: businessName,
        industry,
        location,
        description,
        services,
        contactInfo: contactInfo as any,
        rawResponse: dynamicPayload as any,
      },
    })

    return NextResponse.json({ profile: created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save profile.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await getAuthSession()
  const userEmail = session?.user?.email?.trim()
  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: { profileId?: unknown; details?: unknown; chatHistory?: unknown; removeFieldKey?: unknown }
  try {
    payload = (await req.json()) as { profileId?: unknown; details?: unknown; chatHistory?: unknown; removeFieldKey?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const profileId = asNullableString(payload.profileId)
  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required.' }, { status: 400 })
  }

  const hasDetails = payload.details && typeof payload.details === 'object' && !Array.isArray(payload.details)
  const hasChatHistory = Array.isArray(payload.chatHistory)
  const removeFieldKey = asNullableString(payload.removeFieldKey)
  if (!hasDetails && !hasChatHistory && !removeFieldKey) {
    return NextResponse.json({ error: 'details, chatHistory, or removeFieldKey is required.' }, { status: 400 })
  }

  const existing = await prisma.businessProfile.findFirst({
    where: { id: profileId, userEmail },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
  }

  const raw = existing.rawResponse && typeof existing.rawResponse === 'object' && !Array.isArray(existing.rawResponse)
    ? (existing.rawResponse as Record<string, unknown>)
    : {}
  const existingFields =
    raw.fields && typeof raw.fields === 'object' && !Array.isArray(raw.fields)
      ? (raw.fields as Record<string, unknown>)
      : {}
  const mergedFields = {
    ...existingFields,
    ...(hasDetails ? (payload.details as Record<string, unknown>) : {}),
  }
  if (removeFieldKey && Object.prototype.hasOwnProperty.call(mergedFields, removeFieldKey)) {
    delete mergedFields[removeFieldKey]
  }

  const safeChatHistory = hasChatHistory
    ? (payload.chatHistory as unknown[])
        .map((entry) =>
          entry && typeof entry === 'object' && !Array.isArray(entry)
            ? {
                role: asNullableString((entry as Record<string, unknown>).role) || 'assistant',
                text: asNullableString((entry as Record<string, unknown>).text) || '',
                label: asNullableString((entry as Record<string, unknown>).label) || undefined,
              }
            : null,
        )
        .filter((entry) => Boolean(entry && entry.text))
        .map((entry) => entry as { role: string; text: string; label?: string })
    : (raw.chatHistory && Array.isArray(raw.chatHistory) ? raw.chatHistory : [])

  const updatedRaw = {
    ...raw,
    fields: mergedFields,
    chatHistory: safeChatHistory,
  }

  const updated = await prisma.businessProfile.update({
    where: { id: profileId },
    data: {
      rawResponse: updatedRaw as any,
    },
  })

  return NextResponse.json({ profile: updated })
}

export async function DELETE(req: Request) {
  const session = await getAuthSession()
  const userEmail = session?.user?.email?.trim()
  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: { profileId?: unknown }
  try {
    payload = (await req.json()) as { profileId?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const profileId = asNullableString(payload.profileId)
  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required.' }, { status: 400 })
  }

  const existing = await prisma.businessProfile.findFirst({
    where: { id: profileId, userEmail },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
  }

  await prisma.businessProfile.delete({
    where: { id: profileId },
  })

  return NextResponse.json({ ok: true })
}
