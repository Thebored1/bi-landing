import Nav from '@/components/Nav'
import AuthShell from '@/components/auth/AuthShell'
import GoogleOAuthButton from '@/components/auth/GoogleOAuthButton'
import authExtras from '@/components/auth/AuthFormExtras.module.css'
import { authErrorMessage } from '@/lib/auth-errors'
import { getAuthSession } from '@/lib/auth-session'
import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Log in — Scopo',
  description: 'Sign in to Scopo with Google.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const session = await getAuthSession()
  if (session) {
    redirect('/dashboard')
  }

  const err = typeof searchParams.error === 'string' ? searchParams.error : undefined
  const errorMessage = authErrorMessage(err)

  return (
    <>
      <Nav />
      <main>
        <AuthShell
          title="Log in"
          subtitle="Continue with your Google account to use Scopo."
        >
          {errorMessage ? (
            <p className={authExtras.alert} role="alert">
              {errorMessage}
            </p>
          ) : null}
          <GoogleOAuthButton label="Continue with Google" />
          <p className={authExtras.footer}>
            New here?{' '}
            <Link href="/register" className={authExtras.link}>
              Create an account
            </Link>
          </p>
        </AuthShell>
      </main>
    </>
  )
}
