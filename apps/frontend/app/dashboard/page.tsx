import Link from 'next/link'

const modules = [
  {
    title: 'CRM',
    description: 'Sales pipeline, account health, activity tracking, and revenue forecasting.',
    href: '/dashboard/crm',
    available: true,
  },
  {
    title: 'Finance & Revenue',
    description: 'General ledger, revenue forecasts, and financial performance reporting.',
    href: '/dashboard/finance',
    available: true,
  },
  {
    title: 'Operations',
    description: 'Production run tracking, operational efficiency, and workflow performance.',
    href: '/dashboard/ops',
    available: true,
  },
]

export default function HomePage() {
  return (
    <div style={{ padding: 28, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>

      {/* Welcome */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          Welcome back
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 520 }}>
          Select a module below to explore your reports. Data is sourced live from the Fabric Lakehouse SQL endpoint.
        </div>
      </div>

      {/* Module cards */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 12 }}>
          Modules
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 12,
        }}>
          {modules.map((mod) => (
            <Link key={mod.href} href={mod.href} style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                cursor: 'pointer',
                height: '100%',
                boxSizing: 'border-box',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{mod.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6, flex: 1 }}>{mod.description}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)' }}>Open →</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div style={{ marginTop: 36 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 12 }}>
          Alerts
        </div>
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '20px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 14, opacity: 0.4 }}>🔔</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>No alerts at this time. Report alerts will appear here when they become available.</span>
        </div>
      </div>

    </div>
  )
}
