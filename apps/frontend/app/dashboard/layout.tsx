'use client'

import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const breadcrumbLabels: Record<string, string> = {
  dashboard:    'Home',
  crm:          'CRM',
  opportunities:'Opportunities',
  accounts:     'Account Health',
  activity:     'Activity & Engagement',
  forecasting:  'Forecasting',
  finance:      'Finance & Revenue',
  ops:          'Operations',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs = segments.map((seg, i) => ({
    path: '/' + segments.slice(0, i + 1).join('/'),
    label: breadcrumbLabels[seg] ?? seg,
    isLast: i === segments.length - 1,
  }))

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.path} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && (
                  <span style={{ color: 'var(--muted)', opacity: 0.5, fontSize: 12, userSelect: 'none' }}>›</span>
                )}
                {crumb.isLast ? (
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{crumb.label}</span>
                ) : (
                  <Link href={crumb.path} style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
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

