'use client'

import Link from 'next/link'

const reports = [
  {
    title: 'Sales Opportunities',
    description: 'Pipeline value, win rates, stage funnel, and rep performance across all active deals.',
    href: '/dashboard/crm/opportunities',
    available: true,
    tag: 'Live',   
  },
  {
    title: 'Account Health',
    description: 'Customer engagement scores, renewal risk, and relationship activity trends.',
    href: '/dashboard/crm/accounts',
    available: false,
    tag: 'Coming soon',
  },
  {
    title: 'Activity & Engagement',
    description: 'Call logs, email interactions, and meeting cadence by rep and account.',
    href: '/dashboard/crm/activity',
    available: false,
    tag: 'Coming soon',
  },
  {
    title: 'Forecasting',
    description: 'Revenue forecast vs target with weighted pipeline and historical close rate.',
    href: '/dashboard/crm/forecasting',
    available: false,
    tag: 'Coming soon',
  },
]

export default function CRMLandingPage() {
  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>CRM Reports</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
          Select a report to explore CRM data
        </div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 12,
      }}>
        {reports.map((report) => (
          <ReportCard key={report.href} {...report} />
        ))}
      </div>
    </div>
  )
}

function ReportCard({
  title,
  description,
  href,
  available,
  tag,
}: {
  title: string
  description: string
  href: string
  available: boolean
  tag: string
}) {
  const card = (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      opacity: available ? 1 : 0.5,
      cursor: available ? 'pointer' : 'default',
      height: '100%',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{title}</span>
        <span style={{
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
          padding: '2px 8px', borderRadius: 20, flexShrink: 0,
          background: available ? 'var(--accent)' : 'var(--card2)',
          color: available ? '#fff' : 'var(--muted)',
        }}>
          {tag}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6, flex: 1 }}>
        {description}
      </div>
      {available && (
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)' }}>
          Open report ?
        </div>
      )}
    </div>
  )

  if (!available) return card

  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      {card}
    </Link>
  )
}
