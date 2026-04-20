import { getAuthSession } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lookup — Scopo',
  description: 'Company intelligence lookup.',
}

export default async function LookupPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const session = await getAuthSession()
  if (!session?.user?.email) {
    redirect('/login')
  }

  const raw = typeof searchParams.url === 'string' ? searchParams.url : ''
  const decoded = raw ? (() => {
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  })() : ''

  const query = decoded ? `?url=${encodeURIComponent(decoded)}` : ''
  redirect(`/dashboard${query}`)
}
