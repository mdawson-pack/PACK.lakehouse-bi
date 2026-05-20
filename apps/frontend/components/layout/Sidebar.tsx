'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

type SubItem = { label: string; href: string }
type Module = { label: string; href: string; children?: SubItem[] }

const modules: Module[] = [
  {
    label: 'CRM',
    href: '/dashboard/crm',
    children: [
      { label: 'Opportunities', href: '/dashboard/crm/opportunities' },
    ],
  },
  { label: 'Finance & Revenue', href: '/dashboard/finance' },
  { label: 'Operations',        href: '/dashboard/ops' },
]

const workspace = [
  { label: 'Saved Reports', href: '#' },
  { label: 'Alert Rules',   href: '#' },
  { label: 'Data Sources',  href: '#' },
]

export function Sidebar() {
  const pathname = usePathname()

  // Initialise expanded state: open whichever module the current route belongs to
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const m of modules) {
      if (m.children && (pathname === m.href || pathname.startsWith(m.href + '/'))) {
        init[m.href] = true
      }
    }
    return init
  })

  // When pathname changes (e.g. navigating from home cards), expand the relevant module.
  // Never auto-collapse — only the toggle button collapses.
  useEffect(() => {
    for (const m of modules) {
      if (m.children && (pathname === m.href || pathname.startsWith(m.href + '/'))) {
        setExpanded((prev) => prev[m.href] ? prev : { ...prev, [m.href]: true })
      }
    }
  }, [pathname])

  function toggleExpanded(href: string) {
    setExpanded((prev) => ({ ...prev, [href]: !prev[href] }))
  }

  return (
    <nav style={{
      width: 200,
      background: 'var(--sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)' }}>
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
        {modules.map((item) => {
          const isExpanded = !!expanded[item.href]
          const parentActive = pathname === item.href
          const childActive = !!item.children?.some((c) => pathname === c.href)

          if (item.children) {
            return (
              <div key={item.href}>
                {/* Clickable toggle row — navigates to module root AND toggles children */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Link href={item.href} style={{
                    flex: 1,
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '7px 0 7px 16px',
                    fontSize: 12,
                    color: (parentActive || childActive) ? 'var(--text)' : 'var(--muted)',
                    background: parentActive ? 'var(--sidebar-active)' : 'transparent',
                    borderLeft: parentActive ? '2px solid var(--accent)' : '2px solid transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: (parentActive || childActive) ? 'var(--accent)' : 'var(--muted)',
                      opacity: (parentActive || childActive) ? 1 : 0.4,
                    }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </Link>
                  <button
                    onClick={() => toggleExpanded(item.href)}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '7px 12px 7px 4px',
                      fontSize: 9, color: 'var(--muted)', opacity: 0.6,
                      lineHeight: 1,
                    }}
                  >
                    {isExpanded ? '▲' : '▼'}
                  </button>
                </div>
                {isExpanded && item.children.map((child) => (
                  <NavItem key={child.href} href={child.href} active={pathname === child.href} indent>
                    {child.label}
                  </NavItem>
                ))}
              </div>
            )
          }

          return (
            <NavItem key={item.href} href={item.href} active={pathname === item.href}>
              {item.label}
            </NavItem>
          )
        })}
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
        borderTop: '1px solid var(--border)',
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

function NavItem({ href, active, indent, children }: { href: string; active: boolean; indent?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: indent ? '5px 16px 5px 30px' : '7px 16px',
      fontSize: indent ? 11 : 12,
      color: active ? 'var(--text)' : 'var(--muted)',
      background: active ? 'var(--sidebar-active)' : 'transparent',
      borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
      textDecoration: 'none',
      transition: 'all 0.15s',
    }}>
      <span style={{
        width: indent ? 5 : 7, height: indent ? 5 : 7, borderRadius: '50%', flexShrink: 0,
        background: active ? 'var(--accent)' : 'var(--muted)',
        opacity: active ? 1 : 0.4,
      }} />
      {children}
    </Link>
  )
}
