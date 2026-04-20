import DashboardWorkspace from '@/components/DashboardWorkspace'
import { prisma } from '@/lib/prisma'
import Nav from '@/components/Nav'
import { getAuthSession } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard — Scopo',
  description: 'Your Scopo workspace.',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const session = await getAuthSession()
  const userEmail = session?.user?.email?.trim()
  if (!userEmail) {
    redirect('/login')
  }

  const profiles = await prisma.businessProfile.findMany({
    where: { userEmail },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const raw = typeof searchParams.url === 'string' ? searchParams.url : ''
  const decoded = raw
    ? (() => {
        try {
          return decodeURIComponent(raw)
        } catch {
          return raw
        }
      })()
    : ''

  return (
    <>
      <Nav />
      <main
        style={{
          paddingTop: 72,
          minHeight: '100vh',
          maxWidth: 1240,
          margin: '0 auto',
          paddingLeft: 24,
          paddingRight: 24,
          paddingBottom: 48,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--serif), Georgia, serif',
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            fontWeight: 400,
            marginBottom: 12,
          }}
        >
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6 }}>
          Run lookups and manage saved client business profiles in one place.
        </p>
        <DashboardWorkspace
          initialUrl={decoded}
          initialProfiles={profiles.map((profile: (typeof profiles)[number]) => ({
            ...profile,
            services: Array.isArray(profile.services)
              ? profile.services.filter((item): item is string => typeof item === 'string')
              : null,
            contactInfo:
              profile.contactInfo && typeof profile.contactInfo === 'object' && !Array.isArray(profile.contactInfo)
                ? profile.contactInfo
                : null,
            rawResponse: profile.rawResponse,
            createdAt: profile.createdAt.toISOString(),
            updatedAt: profile.updatedAt.toISOString(),
          }))}
        />
      </main>
    </>
  )
}
