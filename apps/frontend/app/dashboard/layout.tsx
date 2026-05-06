'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const moduleConfig: Record<string, { title: string; subtitle: string }> = {
    '/dashboard/crm':     { title: 'CRM Sales Opportunities', subtitle: 'Fabric Lakehouse · Dynamics 365' },
    '/dashboard/finance': { title: 'Finance & Revenue',       subtitle: 'Fabric Lakehouse · GL & Forecasts' },
    '/dashboard/ops':     { title: 'Operations & Production', subtitle: 'Fabric Lakehouse · Production runs' },
  }

  const current = moduleConfig[pathname] ?? moduleConfig['/dashboard/crm']

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{
          padding: '0 20px',
          height: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'var(--panel)',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{current.title}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{current.subtitle}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={badgeStyle}>FY 2025 · Q2</span>
            <span style={badgeStyle}>All Regions</span>
            <button style={btnStyle}>Export</button>
          </div>
        </div>

        {/* Module content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

const badgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontFamily: 'IBM Plex Mono, monospace',
  padding: '3px 8px',
  borderRadius: 4,
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'var(--muted)',
  background: 'var(--card)',
}

const btnStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  padding: '5px 12px',
  borderRadius: 5,
  background: 'var(--accent)',
  color: '#fff',
  cursor: 'pointer',
  border: 'none',
  fontFamily: 'IBM Plex Sans, sans-serif',
}
