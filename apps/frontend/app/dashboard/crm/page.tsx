'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { KPICard } from '@/components/ui/KPICard'
import { StagePill } from '@/components/ui/StagePill'
import { AgentPanel } from '@/components/agent/AgentPanel'
import type { KPI, PipelineStage, RepWinRate, Opportunity } from '@/types'

// ── Derive all visuals from a set of opportunities ────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  Prospecting:   '#4f7af8',
  Qualification: '#5e87f5',
  Proposal:      '#38c9a0',
  Negotiation:   '#f5a623',
  'Closed Won':  '#38c9a0',
  'Closed Lost': '#ef4444',
}

function deriveVisuals(opps: Opportunity[]) {
  const active   = opps.filter((o) => !o.stage.toLowerCase().includes('closed'))
  const won      = opps.filter((o) => o.stage.toLowerCase().includes('won'))
  const closed   = opps.filter((o) => o.stage.toLowerCase().includes('closed'))

  // KPIs
  const pipelineVal = active.reduce((s, o) => s + o.value, 0)
  const wonVal      = won.reduce((s, o) => s + o.value, 0)
  const winRate     = closed.length ? Math.round(won.length / closed.length * 100) : 0
  const avgDeal     = active.length ? Math.round(pipelineVal / active.length) : 0

  const kpis: KPI[] = [
    { label: 'Pipeline Value', value: `$${(pipelineVal / 1_000_000).toFixed(1)}M`, delta: '', trend: 'flat' },
    { label: 'Won Revenue',    value: `$${(wonVal / 1_000_000).toFixed(1)}M`,      delta: '', trend: 'flat' },
    { label: 'Win Rate',       value: `${winRate}%`,                                delta: '', trend: 'flat' },
    { label: 'Avg Deal Size',  value: `$${(avgDeal / 1_000).toFixed(0)}K`,          delta: '', trend: 'flat' },
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

  const owners = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.opportunities.map((o) => o.owner))).sort()
  }, [data])

  const isFiltered = selectedOwners.size > 0

  const filteredOpps = useMemo(() => {
    if (!data) return []
    return isFiltered
      ? data.opportunities.filter((o) => selectedOwners.has(o.owner))
      : data.opportunities
  }, [data, selectedOwners, isFiltered])

  const { kpis, pipeline, repWinRates } = useMemo(() => {
    if (!data) return { kpis: [], pipeline: [], repWinRates: [] }
    return isFiltered
      ? deriveVisuals(filteredOpps)
      : { kpis: data.kpis, pipeline: data.pipeline, repWinRates: data.repWinRates }
  }, [data, isFiltered, filteredOpps])

  function toggleOwner(owner: string) {
    setSelectedOwners((prev) => {
      const next = new Set(prev)
      next.has(owner) ? next.delete(owner) : next.add(owner)
      return next
    })
  }

  if (isLoading) return <LoadingState />
  if (error || !data) return <ErrorState />

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Page slicer ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--card)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, padding: '10px 14px',
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            Owner
          </span>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {owners.map((owner) => {
              const active = selectedOwners.has(owner)
              return (
                <button
                  key={owner}
                  onClick={() => toggleOwner(owner)}
                  style={{
                    fontSize: 10, padding: '3px 10px', borderRadius: 20,
                    border: active ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.12)',
                    background: active ? 'var(--accent)' : 'transparent',
                    color: active ? '#fff' : 'var(--muted)',
                    cursor: 'pointer', fontWeight: active ? 600 : 400,
                    whiteSpace: 'nowrap', transition: 'all 0.15s ease',
                  }}
                >
                  {owner}
                </button>
              )
            })}
          </div>
          {isFiltered && (
            <>
              <span style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                · {filteredOpps.length} {filteredOpps.length === 1 ? 'opportunity' : 'opportunities'}
              </span>
              <button
                onClick={() => setSelectedOwners(new Set())}
                style={{
                  marginLeft: 'auto', fontSize: 10, color: 'var(--muted)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textDecoration: 'underline', whiteSpace: 'nowrap',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
              >
                Clear
              </button>
            </>
          )}
        </div>

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
              {isFiltered ? Array.from(selectedOwners).join(', ') : 'Top 5 · this quarter'}
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
                        background: rep.rate >= 60 ? 'var(--accent2)' : rep.rate >= 40 ? 'var(--accent)' : 'var(--accent3)',
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {['Opportunity', 'Account', 'Stage', 'Value', 'Close date', 'Owner'].map((h) => (
                  <th key={h} style={{
                    fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.07em', color: 'var(--muted)',
                    background: 'var(--card2)', padding: '8px 12px', textAlign: 'left',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOpps.length > 0 ? (
                filteredOpps.map((opp) => (
                  <tr key={opp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={tdStyle}>{opp.name}</td>
                    <td style={tdStyle}>{opp.account}</td>
                    <td style={tdStyle}><StagePill stage={opp.stage} /></td>
                    <td style={{ ...tdStyle, fontFamily: 'IBM Plex Mono, monospace' }}>
                      ${(opp.value / 1000).toFixed(0)}K
                    </td>
                    <td style={tdStyle}>{opp.closeDate}</td>
                    <td style={tdStyle}>{opp.owner}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: '20px 12px' }}>
                    No opportunities for {selectedOwner}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
