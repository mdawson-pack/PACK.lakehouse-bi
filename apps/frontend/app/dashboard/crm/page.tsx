'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { KPICard } from '@/components/ui/KPICard'
import { StagePill } from '@/components/ui/StagePill'
import { AgentPanel } from '@/components/agent/AgentPanel'
import type { KPI, PipelineStage, RepWinRate, Opportunity } from '@/types'

// ── Derive all visuals from a set of opportunities ────────────────────────────

function fmtCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value}`
}

const STAGE_COLORS: Record<string, string> = {
  Prospecting:   '#4f7af8',
  Qualification: '#a78bfa',
  Proposal:      '#38c9a0',
  Negotiation:   '#f5a623',
  'Closed Won':  '#38c9a0',
  'Closed Lost': '#ef4444',
  Unknown:       '#6b7280',
}

function deriveVisuals(opps: Opportunity[]) {
  const isWon = (o: Opportunity) => (o.status ?? '').trim().toLowerCase() === 'won'
  const isClosed = (o: Opportunity) => {
    const status = (o.status ?? '').toLowerCase()
    if (status) return status.includes('closed') || status.includes('won') || status.includes('lost') || status.includes('dead')
    const stage = o.stage.toLowerCase()
    return stage.includes('closed') || stage.includes('won') || stage.includes('lost') || stage.includes('dead')
  }

  const active   = opps.filter((o) => !isClosed(o))
  const won      = opps.filter((o) => isWon(o))
  const closed   = opps.filter((o) => isClosed(o))

  // KPIs — all aggregate over the full filtered set so cards match the visible table rows
  const pipelineVal = opps.reduce((s, o) => s + o.value, 0)
  const wonVal      = won.reduce((s, o) => s + o.value, 0)
  const winRate     = closed.length ? Math.round(won.length / closed.length * 100) : 0
  const avgDeal     = opps.length ? Math.round(pipelineVal / opps.length) : 0

  const kpis: KPI[] = [
    { label: 'Pipeline Value', value: fmtCurrency(pipelineVal), delta: '', trend: 'flat' },
    { label: 'Won Revenue',    value: fmtCurrency(wonVal),     delta: '', trend: 'flat' },
    { label: 'Win Rate',       value: `${winRate}%`,           delta: '', trend: 'flat' },
    { label: 'Avg Deal Size',  value: fmtCurrency(avgDeal),    delta: '', trend: 'flat' },
  ]

  // Pipeline funnel
  const stageCounts: Record<string, number> = {}
  for (const o of active) stageCounts[o.stage] = (stageCounts[o.stage] ?? 0) + 1
  const maxCount = Math.max(...Object.values(stageCounts), 1)
  const pipeline: PipelineStage[] = Object.entries(stageCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([stage, count]) => ({
      stage,
      count,
      pct: Math.round(count / maxCount * 100),
      color: STAGE_COLORS[stage] ?? '#6b7280',
    }))

  // Win rate by rep (top 5)
  const ownerTotal: Record<string, number> = {}
  const ownerWon:   Record<string, number> = {}
  for (const o of opps)  ownerTotal[o.owner] = (ownerTotal[o.owner] ?? 0) + 1
  for (const o of won)   ownerWon[o.owner]   = (ownerWon[o.owner]   ?? 0) + 1
  const repWinRates: RepWinRate[] = Object.entries(ownerTotal)
    .map(([name, total]) => ({ name, rate: Math.round((ownerWon[name] ?? 0) / total * 100) }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5)

  return { kpis, pipeline, repWinRates }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CRMPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['crm'],
    queryFn: api.crm.getData,
  })

  const [selectedOwners, setSelectedOwners] = useState<Set<string>>(new Set())
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set())
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())
  const [accountQuery, setAccountQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortKey, setSortKey] = useState<'name' | 'account' | 'stage' | 'value' | 'closeDate' | 'status' | 'owner'>('closeDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tableRef.current) tableRef.current.scrollTop = 0
  }, [selectedOwners, selectedStatuses, selectedAccounts, accountQuery])

  const normalizedQuery = accountQuery.trim().toLowerCase()

  const searchedOpps = useMemo(() => {
    if (!data) return []
    if (!normalizedQuery) return data.opportunities
    return data.opportunities.filter((o) =>
      (o.account ?? '').toLowerCase().includes(normalizedQuery) ||
      (o.name ?? '').toLowerCase().includes(normalizedQuery)
    )
  }, [data, normalizedQuery])

  const owners = useMemo(() => {
    return Array.from(new Set(searchedOpps.map((o) => (o.owner ?? '').trim()))).filter(Boolean).sort()
  }, [searchedOpps])

  const statuses = useMemo(() => {
    // Deduplicate case-insensitively; preserve the first-seen display casing.
    const seen = new Map<string, string>() // lowercase key → display value
    for (const o of searchedOpps) {
      const raw = (o.status ?? '').trim()
      if (!raw) continue
      const lower = raw.toLowerCase()
      if (!seen.has(lower)) seen.set(lower, raw)
    }
    return Array.from(seen.values()).sort()
  }, [searchedOpps])

  const accounts = useMemo(() => {
    return Array.from(new Set((data?.opportunities ?? []).map((o) => (o.company ?? '').trim()))).filter(Boolean).sort()
  }, [data])

  const isFiltered = selectedOwners.size > 0 || selectedStatuses.size > 0 || selectedAccounts.size > 0 || normalizedQuery.length > 0

  const filteredOpps = useMemo(() => {
    const lowerStatuses = new Set(Array.from(selectedStatuses).map((s) => s.toLowerCase()))
    return searchedOpps.filter((o) => {
      if (selectedAccounts.size && !selectedAccounts.has((o.company ?? '').trim())) return false
      if (selectedOwners.size && !selectedOwners.has((o.owner ?? '').trim())) return false
      if (selectedStatuses.size && !lowerStatuses.has((o.status ?? '').trim().toLowerCase())) return false
      return true
    })
  }, [searchedOpps, selectedAccounts, selectedOwners, selectedStatuses])

  const { kpis, pipeline, repWinRates } = useMemo(() => {
    if (!data) return { kpis: [], pipeline: [], repWinRates: [] }
    return deriveVisuals(filteredOpps)
  }, [data, filteredOpps])

  const filterSummary = useMemo(() => {
    const parts: string[] = []
    if (normalizedQuery) parts.push(`"${accountQuery.trim()}"`)
    if (selectedAccounts.size) parts.push(Array.from(selectedAccounts).join(', '))
    if (selectedStatuses.size) parts.push(Array.from(selectedStatuses).join(', '))
    if (selectedOwners.size) parts.push(Array.from(selectedOwners).join(', '))
    return parts.join(' · ')
  }, [normalizedQuery, accountQuery, selectedAccounts, selectedOwners, selectedStatuses])

  const sortedOpps = useMemo(() => {
    const items = [...filteredOpps]
    const factor = sortDir === 'asc' ? 1 : -1

    items.sort((a, b) => {
      if (sortKey === 'value') return (a.value - b.value) * factor
      if (sortKey === 'closeDate') return a.closeDate.localeCompare(b.closeDate) * factor
      return String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''), undefined, { sensitivity: 'base' }) * factor
    })

    return items
  }, [filteredOpps, sortKey, sortDir])

  function exportToCsv() {
    const headers = ['Opportunity', 'Account', 'Stage', 'Value ($)', 'Close Date', 'Status', 'Owner']
    const escape = (v: string | number) => {
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = sortedOpps.map((o) => [
      escape(o.name),
      escape(o.account),
      escape(o.stage),
      o.value,
      escape(o.closeDate),
      escape(o.status ?? ''),
      escape(o.owner),
    ].join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `opportunities${filterSummary ? '-filtered' : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function toggleOwner(owner: string) {
    const key = owner.trim()
    setSelectedOwners((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggleStatus(status: string) {
    const key = status.trim()
    setSelectedStatuses((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggleAccount(account: string) {
    const key = account.trim()
    setSelectedAccounts((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggleSort(key: 'name' | 'account' | 'stage' | 'value' | 'closeDate' | 'status' | 'owner') {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir('asc')
  }

  if (isLoading) return <LoadingState />
  if (error || !data) return <ErrorState />

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Filter drawer ── */}
        {(() => {
          const activeCount =
            (normalizedQuery ? 1 : 0) +
            (selectedAccounts.size > 0 ? 1 : 0) +
            (selectedStatuses.size > 0 ? 1 : 0) +
            (selectedOwners.size > 0 ? 1 : 0)
          return (
            <div>
              {/* Trigger bar */}
              <button
                onClick={() => setFiltersOpen((o) => !o)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px',
                  background: 'var(--card)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: filtersOpen ? '8px 8px 0 0' : 8,
                  cursor: 'pointer', color: 'var(--text)',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Filters
                </span>
                {activeCount > 0 && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                    background: 'var(--accent)', color: '#fff',
                  }}>
                    {activeCount} active
                  </span>
                )}
                {isFiltered && (
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                    · {filteredOpps.length} {filteredOpps.length === 1 ? 'record' : 'records'}
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)' }}>
                  {filtersOpen ? '▲' : '▼'}
                </span>
              </button>

              {/* Filter panel */}
              {filtersOpen && (
                <div style={{
                  background: 'var(--card)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '0 0 8px 8px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                  padding: '14px 14px 12px',
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>

                  {/* Company pills */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', width: 56, flexShrink: 0, paddingTop: 4 }}>
                      Company
                    </span>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {accounts.map((account) => {
                        const sel = selectedAccounts.has(account)
                        return (
                          <button key={account} onClick={() => toggleAccount(account)} style={{
                            fontSize: 10, padding: '3px 10px', borderRadius: 20,
                            border: sel ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.12)',
                            background: sel ? 'var(--accent)' : 'transparent',
                            color: sel ? '#fff' : 'var(--muted)',
                            cursor: 'pointer', fontWeight: sel ? 600 : 400,
                            whiteSpace: 'nowrap', transition: 'all 0.15s ease',
                          }}>
                            {account}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Customer search */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', width: 56, flexShrink: 0 }}>
                      Customer
                    </span>
                    <input
                      type="text"
                      value={accountQuery}
                      onChange={(e) => setAccountQuery(e.currentTarget.value)}
                      placeholder="Search account or opportunity name"
                      style={{
                        flex: '0 1 320px', fontSize: 11, color: 'var(--text)',
                        background: 'var(--panel)', border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 6, padding: '6px 10px', outline: 'none',
                      }}
                    />
                  </div>

                  {/* Status pills */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', width: 56, flexShrink: 0, paddingTop: 4 }}>
                      Status
                    </span>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {statuses.map((status) => {
                        const sel = selectedStatuses.has(status)
                        return (
                          <button key={status} onClick={() => toggleStatus(status)} style={{
                            fontSize: 10, padding: '3px 10px', borderRadius: 20,
                            border: sel ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.12)',
                            background: sel ? 'var(--accent)' : 'transparent',
                            color: sel ? '#fff' : 'var(--muted)',
                            cursor: 'pointer', fontWeight: sel ? 600 : 400,
                            whiteSpace: 'nowrap', transition: 'all 0.15s ease',
                          }}>
                            {status}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Owner pills */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', width: 56, flexShrink: 0, paddingTop: 4 }}>
                      Owner
                    </span>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {owners.map((owner) => {
                        const sel = selectedOwners.has(owner)
                        return (
                          <button key={owner} onClick={() => toggleOwner(owner)} style={{
                            fontSize: 10, padding: '3px 10px', borderRadius: 20,
                            border: sel ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.12)',
                            background: sel ? 'var(--accent)' : 'transparent',
                            color: sel ? '#fff' : 'var(--muted)',
                            cursor: 'pointer', fontWeight: sel ? 600 : 400,
                            whiteSpace: 'nowrap', transition: 'all 0.15s ease',
                          }}>
                            {owner}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Footer */}
                  {isFiltered && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <button
                        onClick={() => { setAccountQuery(''); setSelectedAccounts(new Set()); setSelectedOwners(new Set()); setSelectedStatuses(new Set()) }}
                        style={{
                          fontSize: 10, color: 'var(--muted)', background: 'none', border: 'none',
                          cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap',
                          transition: 'color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })()}

        {/* ── KPI row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {kpis.map((kpi) => <KPICard key={kpi.label} kpi={kpi} />)}
        </div>

        {/* ── Charts row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 10 }}>

          {/* Pipeline funnel */}
          <div style={cardStyle}>
            <div style={chartTitleStyle}>Pipeline by stage</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 12 }}>Count · active opportunities only</div>
            {pipeline.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pipeline.map((row) => (
                  <div key={row.stage} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', width: 80, flexShrink: 0, textAlign: 'right' }}>
                      {row.stage}
                    </div>
                    <div style={{ flex: 1, height: 18, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        width: `${row.pct}%`, background: row.color,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--muted)', width: 24, textAlign: 'right' }}>
                      {row.count}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyChart />
            )}
          </div>

          {/* Win rate by rep */}
          <div style={cardStyle}>
            <div style={chartTitleStyle}>Win rate by rep</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 12 }}>
              {isFiltered ? filterSummary : 'Top 5 · this quarter'}
            </div>
            {repWinRates.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {repWinRates.map((rep) => (
                  <div key={rep.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', width: 60, flexShrink: 0, textAlign: 'right' }}>
                      {rep.name}
                    </div>
                    <div style={{ flex: 1, height: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        width: `${rep.rate}%`,
                        background: rep.rate >= 60 ? '#38c9a0' : rep.rate >= 40 ? '#f5a623' : '#e05c5c',
                        opacity: 0.8, transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--muted)', width: 30, textAlign: 'right' }}>
                      {rep.rate}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>

        {/* ── Opportunities table ── */}
        <div style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
              Opportunities
              <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 400, color: 'var(--muted)' }}>
                {sortedOpps.length} {sortedOpps.length === 1 ? 'record' : 'records'}{isFiltered ? ' (filtered)' : ''}
              </span>
            </span>
            <button
              onClick={exportToCsv}
              disabled={sortedOpps.length === 0}
              style={{
                fontSize: 10, padding: '5px 12px', borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent',
                color: sortedOpps.length === 0 ? 'var(--muted)' : 'var(--text)',
                cursor: sortedOpps.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                opacity: sortedOpps.length === 0 ? 0.4 : 1,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { if (sortedOpps.length > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              title="Export visible rows to CSV"
            >
              ↓ Export CSV
            </button>
          </div>
          <div ref={tableRef} style={{ maxHeight: 400, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {[
                  { label: 'Opportunity', key: 'name' as const },
                  { label: 'Account', key: 'account' as const },
                  { label: 'Stage', key: 'stage' as const },
                  { label: 'Value', key: 'value' as const },
                  { label: 'Close date', key: 'closeDate' as const },
                  { label: 'Status', key: 'status' as const },
                  { label: 'Owner', key: 'owner' as const },
                ].map((h) => (
                  <th key={h.key} style={{
                    fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.07em', color: 'var(--muted)',
                    background: 'var(--card2)', padding: '0', textAlign: 'left',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    position: 'sticky', top: 0, zIndex: 1,
                  }}>
                    <button
                      onClick={() => toggleSort(h.key)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: 'none',
                        background: 'transparent',
                        color: 'inherit',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        fontSize: 'inherit',
                        fontWeight: 'inherit',
                        letterSpacing: 'inherit',
                        textTransform: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      title={`Sort by ${h.label}`}
                    >
                      <span>{h.label}</span>
                      <span style={{ opacity: sortKey === h.key ? 1 : 0.35 }}>
                        {sortKey === h.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedOpps.length > 0 ? (
                sortedOpps.map((opp) => (
                  <tr key={opp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={tdStyle}>{opp.name}</td>
                    <td style={tdStyle}>{opp.account}</td>
                    <td style={tdStyle}><StagePill stage={opp.stage} /></td>
                    <td style={{ ...tdStyle, fontFamily: 'IBM Plex Mono, monospace' }}>
                      {fmtCurrency(opp.value)}
                    </td>
                    <td style={tdStyle}>{opp.closeDate}</td>
                    <td style={tdStyle}>{opp.status ?? ''}</td>
                    <td style={tdStyle}>{opp.owner}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: '20px 12px' }}>
                    No opportunities for {filterSummary || 'the current selection'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

      </div>

      {/* Agent panel */}
      <AgentPanel module="crm" />
    </div>
  )
}

// ── Supporting components ─────────────────────────────────────────────────────

function EmptyChart() {
  return (
    <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
      No data for selection
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Skeleton height={44} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[0,1,2,3].map(i => <Skeleton key={i} height={80} />)}
        </div>
        <Skeleton height={220} />
        <Skeleton height={200} />
      </div>
    </div>
  )
}

function ErrorState() {
  return (
    <div style={{ padding: 24, color: 'var(--accent4)' }}>
      Failed to load CRM data. Make sure the backend is running on port 8000.
    </div>
  )
}

function Skeleton({ height }: { height: number }) {
  return (
    <div style={{
      height, background: 'var(--card)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8, padding: 14,
}

const chartTitleStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 3,
}

const tdStyle: React.CSSProperties = {
  padding: '7px 12px', color: 'var(--text)',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
}
