const nextConfig = {
  transpilePackages: ['next-auth'],
  /**
   * Default dev uses Webpack (not Turbopack) so server RSC + client chunks stay on one graph — avoids
   * `Cannot read properties of undefined (reading 'call')` in webpack-runtime during flight decode.
   * Use `npm run dev:turbo` if you want Turbopack. Dev-only: disable persistent cache to reduce Windows chunk races.
   */
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false
    }
    return config
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh4.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh5.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh6.googleusercontent.com', pathname: '/**' },
    ],
  },
}

module.exports = nextConfig
