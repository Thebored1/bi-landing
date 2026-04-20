'use client'

import NextTopLoader from 'nextjs-toploader'

export default function RouteTopLoader() {
  return (
    <NextTopLoader
      color="#c8f04a"
      initialPosition={0.08}
      crawlSpeed={180}
      height={3}
      crawl
      showSpinner={false}
      easing="ease"
      speed={220}
      shadow="0 0 8px rgba(200, 240, 74, 0.45)"
      zIndex={1700}
    />
  )
}
