import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === 'development',
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID?.trim() ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() ?? '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
    async jwt({ token, account, profile }) {
      if (account && profile && 'picture' in profile && typeof profile.picture === 'string') {
        token.picture = profile.picture
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && typeof token.picture === 'string') {
        session.user.image = token.picture
      }
      return session
    },
  },
}
