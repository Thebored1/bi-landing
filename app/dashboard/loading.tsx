import Nav from '@/components/Nav'

function SkeletonBlock({
  width,
  height,
  radius = 10,
}: {
  width: string | number
  height: string | number
  radius?: number
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background:
          'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.06) 100%)',
        backgroundSize: '200% 100%',
        animation: 'dashboardSkeletonPulse 1.2s ease-in-out infinite',
      }}
    />
  )
}

export default function DashboardLoading() {
  return (
    <>
      <style>{`
        @keyframes dashboardSkeletonPulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
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
        aria-busy="true"
        aria-live="polite"
      >
        <div style={{ marginBottom: 28 }}>
          <SkeletonBlock width={180} height={36} radius={8} />
          <div style={{ height: 10 }} />
          <SkeletonBlock width="58%" height={18} radius={8} />
        </div>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <div
            style={{
              border: '1px solid var(--border)',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 14,
              padding: 16,
            }}
          >
            <SkeletonBlock width="42%" height={18} />
            <div style={{ height: 14 }} />
            <SkeletonBlock width="100%" height={44} />
            <div style={{ height: 10 }} />
            <SkeletonBlock width={150} height={38} radius={999} />
            <div style={{ height: 16 }} />
            <SkeletonBlock width="70%" height={14} radius={8} />
            <div style={{ height: 8 }} />
            <SkeletonBlock width="90%" height={14} radius={8} />
            <div style={{ height: 8 }} />
            <SkeletonBlock width="64%" height={14} radius={8} />
          </div>

          <div
            style={{
              border: '1px solid var(--border)',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 14,
              padding: 16,
            }}
          >
            <SkeletonBlock width="52%" height={18} />
            <div style={{ height: 14 }} />
            <SkeletonBlock width="100%" height={68} />
            <div style={{ height: 10 }} />
            <SkeletonBlock width="100%" height={68} />
            <div style={{ height: 10 }} />
            <SkeletonBlock width="100%" height={68} />
          </div>
        </section>
      </main>
    </>
  )
}
