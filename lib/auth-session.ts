import { headers } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

function resolveOriginFromHeaders(): string | null {
  const h = headers()
  const forwardedProto = h.get('x-forwarded-proto')?.trim()
  const forwardedHost = h.get('x-forwarded-host')?.trim()
  const host = forwardedHost || h.get('host')?.trim()
  if (!host) return null
  const proto = forwardedProto || (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export async function getAuthSession() {
  const origin = resolveOriginFromHeaders()
  if (origin) {
    process.env.NEXTAUTH_URL = origin
  }
  return getServerSession(authOptions)
}
