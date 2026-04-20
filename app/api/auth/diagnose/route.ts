import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Dev-only: no secrets returned. Open GET /api/auth/diagnose while `npm run dev` is running
 * to verify env + the exact redirect URI Google must allow.
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }

  const rawUrl = process.env.NEXTAUTH_URL?.trim() || ''
  let origin = 'http://localhost:3000'
  try {
    if (rawUrl) origin = new URL(rawUrl).origin
  } catch {
    origin = 'http://localhost:3000'
  }

  const expectedRedirectUri = `${origin.replace(/\/$/, '')}/api/auth/callback/google`
  const requestHost = req.headers.get('host') || ''
  let envHost = ''
  try {
    envHost = new URL(rawUrl || origin).host
  } catch {
    envHost = ''
  }

  const hostMismatch =
    requestHost && envHost && requestHost !== envHost
      ? `Browser is on host "${requestHost}" but NEXTAUTH_URL is for "${envHost}". Set NEXTAUTH_URL in .env.local to the same origin you use in the address bar (including port), restart dev, and add that exact callback URL in Google Console.`
      : null

  const id = process.env.GOOGLE_CLIENT_ID?.trim() ?? ''
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? ''
  const nsecret = process.env.NEXTAUTH_SECRET?.trim() ?? ''

  const clientIdHint =
    id.length > 24
      ? `${id.slice(0, 12)}…${id.slice(-12)}`
      : id
        ? '(short / unexpected format)'
        : '(empty)'

  return NextResponse.json({
    expectedGoogleRedirectUri: expectedRedirectUri,
    nextAuthUrlEffective: rawUrl || '(fallback from next.config — see next.config.js)',
    requestHost,
    hostMismatch,
    clientIdHint,
    envSet: {
      GOOGLE_CLIENT_ID: id.length > 15,
      GOOGLE_CLIENT_SECRET: secret.length > 8,
      NEXTAUTH_SECRET: nsecret.length > 8,
    },
    googleClientIdLooksLikeWebClient: id.includes('.apps.googleusercontent.com'),
    tips: [
      'After changing Google Console or .env.local, wait up to ~5 minutes and restart `npm run dev`.',
      'In Google Cloud, the redirect URI must be under **Authorized redirect URIs** (not only JavaScript origins).',
      'Use the same OAuth **Web client** whose id/secret are in GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
    ],
  })
}
