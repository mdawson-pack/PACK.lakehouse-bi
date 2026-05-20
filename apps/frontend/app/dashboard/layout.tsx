'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

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
          borderBottom: '1px solid var(--border)',
          background: 'var(--panel)',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{current.title}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{current.subtitle}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => setTheme((t) => t === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                fontSize: 14,
                background: 'none',
                border: '1px solid rgba(128,128,128,0.2)',
                borderRadius: 6,
                padding: '3px 7px',
                cursor: 'pointer',
                color: 'var(--muted)',
                lineHeight: 1,
              }}
            >
              {theme === 'dark' ? '☀' : '🌙'}
            </button>
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

