import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth-options'

function resolveOrigin(req: Request): string {
  const forwardedProto = req.headers.get('x-forwarded-proto')?.trim()
  const forwardedHost = req.headers.get('x-forwarded-host')?.trim()
  const host = forwardedHost || req.headers.get('host')?.trim()
  if (host) {
    const proto = forwardedProto || (host.includes('localhost') ? 'http' : 'https')
    return `${proto}://${host}`
  }
  return new URL(req.url).origin
}

async function authHandler(req: Request, ctx: { params: { nextauth: string[] } }) {
  process.env.NEXTAUTH_URL = resolveOrigin(req)
  const handler = NextAuth(authOptions)
  return handler(req, ctx)
}

export { authHandler as GET, authHandler as POST }
