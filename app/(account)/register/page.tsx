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
  title: 'Create account — Scopo',
  description: 'Sign up for Scopo with Google.',
}

export default async function RegisterPage({
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
          title="Create your account"
          subtitle="Use Google to get started. First-time sign-in creates your Scopo account automatically."
        >
          {errorMessage ? (
            <p className={authExtras.alert} role="alert">
              {errorMessage}
            </p>
          ) : null}
          <GoogleOAuthButton label="Sign up with Google" />
          <p className={authExtras.footer}>
            Already have an account?{' '}
            <Link href="/login" className={authExtras.link}>
              Log in
            </Link>
          </p>
        </AuthShell>
      </main>
    </>
  )
}
