'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const modules = [
  { label: 'CRM Opportunities', href: '/dashboard/crm' },
  { label: 'Finance & Revenue',  href: '/dashboard/finance' },
  { label: 'Operations',         href: '/dashboard/ops' },
]

const workspace = [
  { label: 'Saved Reports', href: '#' },
  { label: 'Alert Rules',   href: '#' },
  { label: 'Data Sources',  href: '#' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <nav style={{
      width: 200,
      background: 'var(--sidebar)',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.02em' }}>
          Lakehouse BI
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, fontFamily: 'IBM Plex Mono, monospace' }}>
          FABRIC / PRODUCTION
        </div>
      </div>

      {/* Modules section */}
      <div style={{ padding: '10px 0' }}>
        <SectionLabel>Modules</SectionLabel>
        {modules.map((item) => (
          <NavItem key={item.href} href={item.href} active={pathname === item.href}>
            {item.label}
          </NavItem>
        ))}
      </div>

      {/* Workspace section */}
      <div style={{ padding: '10px 0' }}>
        <SectionLabel>Workspace</SectionLabel>
        {workspace.map((item) => (
          <NavItem key={item.label} href={item.href} active={false}>
            {item.label}
          </NavItem>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* User */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: '#2a3060',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 600, color: '#8fa6f5', flexShrink: 0,
        }}>
          MJ
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            M. Johnson
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>Sales Manager</div>
        </div>
      </div>
    </nav>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 600, color: 'var(--muted)',
      letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '6px 16px 4px',
    }}>
      {children}
    </div>
  )
}

function NavItem({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '7px 16px',
      fontSize: 12,
      color: active ? 'var(--text)' : 'var(--muted)',
      background: active ? '#1e2235' : 'transparent',
      borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
      textDecoration: 'none',
      transition: 'all 0.15s',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: active ? 'var(--accent)' : 'var(--muted)',
        opacity: active ? 1 : 0.4,
      }} />
      {children}
    </Link>
  )
}
