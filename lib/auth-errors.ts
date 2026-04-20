/** User-safe copy for NextAuth `error` query values. */
export function authErrorMessage(code: string | undefined): string | null {
  if (!code) return null
  const map: Record<string, string> = {
    Configuration: 'Server sign-in is not configured correctly.',
    AccessDenied: 'Access was denied.',
    Verification: 'The sign-in link is no longer valid.',
    Default: 'Could not sign you in. Please try again.',
    OAuthSignin: 'Could not start Google sign-in. Check OAuth client settings.',
    OAuthCallback: 'Something went wrong after Google sign-in.',
    OAuthCreateAccount: 'Could not create an account from this Google profile.',
    EmailCreateAccount: 'Could not create an account.',
    Callback: 'Sign-in failed.',
    OAuthAccountNotLinked:
      'This email is already linked to another sign-in method.',
    EmailSignin: 'Could not send the sign-in email.',
    CredentialsSignin: 'Invalid credentials.',
    SessionRequired: 'You need to be signed in to view that page.',
  }
  return map[code] ?? map.Default
}
